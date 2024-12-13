import { defineDriver } from "unstorage";
import fs from "fs";
import * as xml2js from "xml2js";
import request from "sync-request";
import slugify from "slugify";
import sanitizeHtml from "sanitize-html";

const cachePath = ".cache/successfactors-jobs-feed.json";

const fetchContent = async (opts) => {
  let cachedItems = {};
  let jobs = {};

  const refresh  = opts.driverOptions.refresh ? parseInt(opts.driverOptions.refresh) : 30;

  let lastModified = "";
  let cache = { updated: "", items: {} };
  try {
    if (fs.existsSync(cachePath)) {
      // console.log("feed: loading from cache file; ", cachePath);
      const cachedData = await fs.readFileSync(cachePath);
      cache = JSON.parse(cachedData.toString());
    } else {
      console.log("feed: no previous cache file, using; ", cachePath);
    }
  } catch (ex) {
    console.error("feed: unable to read content cache file; ", ex);
  }

  if (cache && cache.items) {
    // console.log("feed: cached items: " + Object.keys(cache?.items)?.length + ", updated; ", new Date(cache?.updated));
    cachedItems = cache.items;
    jobs = cache.items;
    lastModified = cache.updated;
  } else {
    console.log("feed: no previous file, fetching all from remote");
  }

  const updated = new Date();

  const timestamp = new Date(Date.now() - refresh*60000);
  if (!lastModified || refresh === -1 || timestamp.getTime() > new Date(lastModified).getTime()) {
    cachedItems = {};
    jobs = {};
    console.log("feed: fetching jobs from: ", opts.driverOptions.host);
    console.time("feed: fetching took");
    let count = 0;

    const results = await fetch(opts.driverOptions.host);

    if (results) {
      Object.keys(results).forEach(key => {
        const job = results[key];
        cachedItems[job.id] = job;
        jobs[job.id] = job;
        count++;
      });
      console.log("feed: " + count + " jobs");
    }
    console.timeEnd("feed: fetching took");

    if (!fs.existsSync(".cache")) {
      console.log("feed: creating .cache directory");
      fs.mkdirSync(".cache");
    }
    fs.writeFileSync(cachePath,
      JSON.stringify({ updated: updated.toISOString(), items: cachedItems }, null, 2)
    );
  } else {
    // console.log(`feed: not fetching new content yet, refresh every ${refresh} minutes`)
  }

  return jobs;
}

async function fetch(feedUrl) {
  const jobItems = {};
  const res = request('GET', feedUrl, {
    headers: {'Accept-Language': 'en', 'Accept': 'application/rss+xml' },
  });
  if (res.statusCode >= 300) {
    console.log("feed: unexpected HTTP response code; ", res.statusCode);
    console.log("feed: response message; ", res.statusText);
  }

  const data = await xml2json(res.getBody().toString());

  // the format of the output might be different for different feeds, so you might need to change the selector
  // console.log("feed: data:", JSON.stringify(data))
  if (data.rss?.channel[0]?.item) {
    data.rss.channel[0].item.forEach((post) => {
      const job = getJob(post);
      jobItems[job.id] = job;
    });
  } else {
    console.log("feed: no data provided by feed endpoint, check selector");
  }
  return jobItems;
}

// this function needs to be customized depending on the format of job items in the feed
function getJob(post) {
  const job = {};

  job.type = 'job';
  job.title = post.title[0];
  job.id = slugify(job.title, {lower: true, strict: true}) + ".json"; // the id needs a suffix

  job.content = sanitizeHtml(post.description[0]);
  job.description = sanitizeHtml(post.description[0], {allowedTags: []}).substring(0,160).trim();
  job.posted = getPosted(post);
  job.deadline = null;
  job.link = post.link[0];

  // optional fields if present in the feed
  // job.workFunction = post.filter2[0].value[0]
  // job.workType = post.filter3[0].value[0]
  // job.location = post.filter4[0].value[0]

  return job;
}

function getPosted(post) {
  let pubdate = "";
  try {
    const pubdate = post.pubdate[0];
    return Date.parse(pubdate);
  } catch (exception) {
    console.log("feed: unable to parse date; ", pubdate);
  }
  return null;
}

function mapNames(name) {
  if ("Job-Listing" === name) {
    name = "items";
  }
  if ("Job" === name) {
    name = "postings";
  }
  if ("JobTitle" === name) {
    name = "title";
  }
  if ("Job-Description" === name) {
    name = "description";
  }
  if ("Posted-Date" === name) {
    name = "posted";
  }
  return name.toLowerCase();
}

async function xml2json(xml) {
  const parser = new xml2js.Parser({ tagNameProcessors: [mapNames] });
  parser.on('error', function(err) { console.log('feed: Parser error', err); });

  return new Promise((resolve, reject) => {
    parser.parseString(xml, function (err, json) {
      if (err) {
        reject(err);
      } else {
        resolve(json);
      }
    });
  });
}


export default defineDriver(opts => {
  let lastCheck = 0;
  let syncPromise;

  let jobs = {};

  const syncContent = async () => {
    if ((lastCheck + opts.ttl * 1000) > Date.now()) {
      return;
    }

    if (!syncPromise) {
      syncPromise = fetchContent(opts);
    }

    jobs = await syncPromise;
    lastCheck = Date.now();
    syncPromise = undefined;
  }

  return {
    getItem: async (key) => {
      await syncContent();
      return jobs[key];
    },
    async hasItem(key) {
      await syncContent();
      return key in jobs;
    },
    async setItem(key, value) {},
    async removeItem(key) {},

    // getMeta() is only called to check if a __deleted attribute is set.
    // see https://github.com/nuxt/content/blob/d8792efbb41de4e0c56361e940a2f042b58c816b/src/runtime/server/storage.ts#L105
    async getMeta(key) {
      await syncContent();
      const job = jobs[key];
      return job ? job.meta : null;
    },
    async getKeys() {
      await syncContent();
      return Object.keys(jobs);
    },
  };
});

