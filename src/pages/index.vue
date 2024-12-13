<template>
  <main class="m-2">
    <SearchForm :query="q" @search="searchCB" />

    <ContentList :query="contentQuery">
      <template #default="{ list }">

        <div class="relative flex w-100 flex-col rounded-lg border border-slate-200">
          <nav class="flex flex-col gap-1 p-1.5" v-for="(job, index) in list">
            <JobPosting :job="job"/>
          </nav>
          <div class="m-2 flex flex-row flex"><div class="ml-auto">{{ list.length }} jobs found</div></div>
        </div>
      </template>

      <template #not-found>
        <h3>No jobs found..</h3>
      </template>
    </ContentList>

  </main>
</template>
<script setup lang="ts">

const q = ref(useRoute().query.q);
const contentQuery = ref(getQuery(q.value));

async function searchCB(query) {
  console.log("searchCB: ", query);
  q.value = query
  await useRouter().push({query: {q: q.value}});
  contentQuery.value = getQuery(q.value);
}

function getQuery(queryString) {
  return {
    path: '/',
    type: 'job',
    limit: 50,
    sort: [{ date: -1 }],
    where: !queryString ? {} : {
      $or: [
        {
          content: {
            $icontains: queryString
          }
        },
        {
          title: {
            $icontains: queryString
          }
        }
      ]
    },
  }
}
</script>
