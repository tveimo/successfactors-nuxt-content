<template>
  <main>
    <ContentDoc v-slot="{ doc }">
      <CommonHeading :title="doc.title" :deadline="doc.deadline" :posted="doc.posted" back="/jobsfeed"/>

      <div v-html="doc.content"></div>
    </ContentDoc>
  </main>
</template>
<style lang="css">
  p { margin-top: 3px; }
</style>
