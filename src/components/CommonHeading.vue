<template>
  <h3 class="border-gray-100 bg-gray-300 text-gray-900 mb-4 mt-2 rounded-lg">
    <div class="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
      <p class="flex-shrink-0 pr-2 border-x-gray-700 h-max"><a v-bind:href="back">
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#333">
          <path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z"/>
        </svg>
      </a></p>
      <div class="flex-grow" v-html="title"/>
      <div v-if="posted">posted: {{ $formatDate(posted) }}</div>
      <div v-if="deadline" class="ml-2">deadline: {{ $formatDate(deadline) }}</div>
    </div>
  </h3>


</template>


<script setup lang="ts">
const props = defineProps({
  deadline: { required: false, },
  posted: { required: false, },
  title: { required: false, },
  back: { required: false, },
});
const { posted, deadline, title, back } = props;
</script>
