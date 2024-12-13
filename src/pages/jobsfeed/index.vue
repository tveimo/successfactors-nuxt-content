<template>
  <CommonHeading title="All Jobs by Feed" back="/" />

  <ContentList path="/jobsfeed">
    <template #default="{ list }">
      <div class="relative flex w-100 flex-col rounded-lg border border-slate-300 bg-gray-100 shadow-sm">
        <nav class="flex min-w-[240px] flex-col gap-1 p-1.5" v-for="(job, index) in list">
          <JobPosting :job="job"/>
        </nav>
      </div>

    </template>
    <template #not-found>
      <h3>No jobs found..</h3>
    </template>
  </ContentList>
</template>
