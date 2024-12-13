import { resolve } from "node:path";

export default defineNuxtConfig({
  srcDir: 'src',
  modules: ['@nuxt/content', '@nuxtjs/tailwindcss'],
  content: {
    sources: {
      'jobsapi': {
        driver: resolve('src', 'driver', 'successfactors-api.mjs'),
        prefix: '/jobsapi',
        driverOptions: {
          cert: process.env.SUCCESSFACTORS_API_USER_CERT,
          key: process.env.SUCCESSFACTORS_API_USER_KEY,
          host: process.env.SUCCESSFACTORS_HOST,
          clientId: process.env.SUCCESSFACTORS_CLIENT_ID,
          companyId: process.env.SUCCESSFACTORS_COMPANY_ID,
          refresh: 30,
        }
      },
      'jobsfeed': {
        driver: resolve('src', 'driver', 'successfactors-feed.mjs'),
        prefix: '/jobsfeed',
        driverOptions: {
          host: process.env.SUCCESSFACTORS_FEED_HOST,
          refresh: 30,
        }
      },
    }
  },
  compatibilityDate: '2024-12-01'
})
