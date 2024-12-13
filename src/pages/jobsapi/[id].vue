<template>
  <main>
    <ContentDoc v-slot="{ doc }">
      <CommonHeading :title="doc.title" :deadline="doc.deadline" :posted="doc.posted" back="/jobsapi"/>

      <div v-html="doc.content"></div>

      <div v-if="doc.link" class="my-2"><a href="doc.link">Link to Jobposting</a></div>

    </ContentDoc>
  </main>
</template>
<style lang="css">
  p { margin-top: 3px; }
</style>
