import { defineDriver } from "unstorage";
import fs from "fs";
import slugify from "slugify";
import sanitizeHtml from "sanitize-html";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import Saml20 from "saml";

const cachePath = ".cache/successfactors-jobs-api.json";

const fetchContent = async (opts) => {
  let cachedItems = {};
  let jobs = {};

  const refresh  = opts.driverOptions.refresh ? parseInt(opts.driverOptions.refresh) : 30;

  let lastModified = "";
  let cache = { updated: "", items: {} };
  try {
    if (fs.existsSync(cachePath)) {
      // console.log("API: loading from cache file; ", cachePath);
      const cachedData = await fs.readFileSync(cachePath);
      cache = JSON.parse(cachedData.toString());
    } else {
      console.log("API: no previous cache file, using; ", cachePath);
    }
  } catch (ex) {
    console.error("API: unable to read content cache file; ", ex);
  }

  if (cache && cache.items) {
    cachedItems = cache.items;
    jobs = cache.items;
    lastModified = cache.updated;
  } else {
    console.log("API: no previous file, fetching from host: ", opts.driverOptions.host);
  }

  const updated = new Date();

  const timestamp = new Date(Date.now() - refresh*60000);
  if (!lastModified || refresh == -1 || timestamp.getTime() > new Date(lastModified).getTime()) {
    cachedItems = {};
    jobs = {};
    console.time("API: fetching took");
    let count = 0;

    const results = await fetchJobs(opts);

    if (results) {
      Object.keys(results).forEach(key => {
        const job = results[key];
        cachedItems[job.id] = job;
        jobs[job.id] = job;
        count++;
      });
      console.log("API: " + count + " jobs");
    }
    console.timeEnd("API: fetching took");

    if (!fs.existsSync(".cache")) {
      console.log("API: creating .cache directory");
      fs.mkdirSync(".cache");
    }
    fs.writeFileSync(cachePath,
      JSON.stringify({ updated: updated.toISOString(), items: cachedItems }, null, 2)
    );
  } else {
    // console.log(`API: not fetching new content yet, refresh every ${refresh} minutes`);
  }

  return jobs;
}

async function fetchJobs(opts) {
  let results = {};
  try {
    const assertion = await generateSAMLBearerAssertion(
      opts.driverOptions.clientId,
      opts.driverOptions.companyId,
      opts.driverOptions.host,
      opts.driverOptions.cert,
      opts.driverOptions.key);

    if (!assertion) {
      console.error("API: SAML assertion is undefined, check your certificate and key");
    }
    const token = await getAuthToken(opts.driverOptions.clientId, opts.driverOptions.companyId, opts.driverOptions.host, assertion);

    results = await fetchJobRequisitions(opts.driverOptions.clientId, opts.driverOptions.companyId, opts.driverOptions.host, token.access_token);
  } catch (exception) {
    console.error("API: unable to fetch jobs", exception);
  }
  return results;
}

//  With a cert / key pair, we can create an assertion and sign it.
async function generateSAMLBearerAssertion(clientId, companyId, host, cert, key) {
  try {
    const options = {
      cert: cert.replace(/\\n/g,'\n').replace(/\\=/g,'='),
      key: key.replace(/\\n/g,'\n').replace(/\\=/g,'='),
      issuer: 'www.successfactors.com',
      lifetimeInSeconds: 3600,
      attributes: {
        'api_key': clientId,
      },
      includeAttributeNameFormat: false,
      sessionIndex: uuidv4().toString(),
      authnContextClassRef: 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
      nameIdentifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
      nameIdentifier: 'api_user',
      recipient: host + '/oauth/token',
      audiences: 'www.successfactors.com',
      signatureAlgorithm: 'rsa-sha256',
      digestAlgorithm: 'sha1',
      signatureNamespacePrefix: 'ds',
    };

    let signedAssertion = Saml20.Saml20.create(options);
    if (!signedAssertion) {
      console.error("API: unable to generate signed assertion, please check certificates!");
      return "";
    }
    signedAssertion = btoa(signedAssertion);
    return signedAssertion;
  } catch (ex) {
    console.error("API: unable to create SAML assertion; ", ex);
  }
  return ""
}

// once we have an SAML assertion, we can then get an oauth bearer token
async function getAuthToken(clientId, companyId, host, assertion) {
  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('company_id', companyId);
  params.append('grant_type',  "urn:ietf:params:oauth:grant-type:saml2-bearer");
  params.append("assertion", assertion);

  try {
    const response = await axios.post(host + '/oauth/token', params);
    return response.data;
  } catch(ex) {
    console.error("API: unable to fetch oauth token; ", ex);
  }

  return { access_token: "", expires_in: 0, token_type: "" }
}

// With an oauth bearer token we can call the JobRequisitions API endpoint.
// This function needs to be adjusted to how your job data is structured.
async function fetchJobRequisitions(clientId, companyId, host, accessToken) {

  const midnight = new Date().toISOString().substring(0, 11) + "00:00:00";

  // api documented here: https://api.sap.com/api/RCMJobRequisition/path/get_JobRequisition
  const params= {
    $format: 'json',
    $top: '100',
    // The required expansion might be different, so tweak as necessary
    $expand: 'jobRequisition,jobRequisition/jobReqLocale,jobRequisition/primaryLocation,jobRequisition/employeetype',
    // '$expand': 'jobRequisition,jobRequisition/jobReqLocale,jobRequisition/primaryLocation,jobRequisition/employeetype',
    // '$expand': 'jobRequisition,jobRequisition/department_obj,jobRequisition/state,jobRequisition/status,jobRequisition/filter1,jobRequisition/filter2,jobRequisition/filter3,jobRequisition/filter4,jobRequisition/businessUnit_obj,jobRequisition/primaryLocation,jobRequisition/employeetype,jobRequisition/location_obj',
    $filter: "boardId eq '_external' and (postEndDate gt datetime'" + midnight + "' or postEndDate eq null)",
    $orderby: 'postStartDate desc',
    client_id: clientId,
    company_id: companyId,
    grant_type: 'urn:ietf:params:oauth:grant-type:saml2-bearer',
  }

  const jobItems = {};
  try {
    // if you have issues connecting to SAP Successfactors, turn on the HTTP protocol chatter

    // axios.interceptors.request.use(request => {
    //   console.log('API: Starting Request', JSON.stringify(request, null, 2))
    //   return request
    // })

    // axios.interceptors.response.use(response => {
    //   console.log('API: Response:', JSON.stringify(response, null, 2))
    //   return response
    // })

    const response = await axios.get(host + '/odata/v2/JobRequisitionPosting',
      { params, headers: { Authorization : `Bearer ${accessToken}` } });

    response.data.d.results.forEach((item) => {
      let job = {};
      const res = item.jobRequisition.jobReqLocale.results[0];

      job.title = res.jobTitle;
      job.id = slugify(res.jobTitle + "-" + item.jobPostingId, {lower: true, strict: true}) + ".json";
      job.type = 'job';

      try {
        job.deadline = parseSFDate(item.postEndDateOffset);
        job.posted = parseSFDate(item.postStartDateOffset);

        job.content = sanitizeHtml(res.extJobDescHeader) +
          sanitizeHtml(res.externalJobDescription) +
          sanitizeHtml(res.extJobDescFooter);
        job.description = sanitizeHtml(res.externalJobDescription, {allowedTags: []}).substring(0, 300).trim();
     } catch (exception) {
        console.error("API: unable to fetch data; ", exception);
      }

      jobItems[job.id] = job;
    })

    return jobItems;
  } catch(error) {
    console.error("API: unable to fetch data; ", error);
  }

  return jobItems;
}

function parseSFDate(str) {
  // date strings might looks like /Date(1689724799000)/ or /Date(1688692430000+0000)/
  if (!str) {
    return null;
  }
  if (str.startsWith("/Date(")) {
    str = str.substring(6);
  }
  if (str.endsWith(")/")) {
    str = str.substring(0, str.length - 2);
  }
  if (str.endsWith("+0000")) {
    // TODO: accommodate different timezone
    str = str.substring(0, str.length - 5);
  }
  if (str.length == 13) {
    return new Date(parseInt(str));
  }
  return null;
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

