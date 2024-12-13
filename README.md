# successfactors-nuxt-content
Publishing SAP Successfactors Job Postings with Nuxt Content

Are you trying to integrate job postings from SAP SuccessFactors into your Nuxt.js based website?

If the jobs are available as an RSS / Atom feed, then it's fairly simple. You can write a script that periodically import jobs into a Nuxt Content folder, convert to markdown if wanted, and go from there. You will need to run the script as a scheduled / crontab job, to account for new or expired job postings.

Another option is to use a Nuxt Content driver, which does the work of periodically fetching new content and makes it available for rendering and queries. This repository contains sample code that does that.

This repository also contains an alternative method to fetch job postings from SAP SuccessFactors, by using the Open Data (OData) API to query data directly. 

Using the OData API requires authentication however, and I cannot post any credentials in this repository for testing so you will have to provide those in the `.env` file.

Authentication is a two-step process; we assume we have the configuration containing a certificate & key pair, and clientId and companyId. We use this data to create and sign an SAML assertion. When such an assertion is signed with our private key, it can be verified later with the certificate.

The second step is to call the auth token endpoint, passing in the same IDs and the signed assertion. If it approves the assertion, it will provide back a token that we can pass to the API endpoint as a bearer token in the HTTP header. 

The last step in fetching data from the API endpoint is then a fairly standard HTTP REST call, with the provided bearer token, our identifying IDs, and a request string crafted with the knowledge about the various type of data we can fetch. 

More information is in the source of the successfactors-api.mjs driver.

For additional detailed info on how to authenticate with SAP APIs, you can have a look here
https://community.sap.com/t5/human-capital-management-blogs-by-sap/how-to-generate-saml-bearer-assertion-token-for-oauth2samlbearerassertion/ba-p/13502801


Icons from the google material icons fontset.
