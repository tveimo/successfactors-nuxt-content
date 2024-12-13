import moment from "moment";

export default defineNuxtPlugin((nuxtApp) => {
  return {
    provide: {
      formatDate(value) {
        if (value) {
          if (typeof value === 'number') {
            return moment(value).format('LL');
          }
          return moment(String(value)).format('LL');
        }
        return "";
      }
    }
  }
})
