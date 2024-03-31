const { lazy } = require('react');

/**
 * @type {import('gatsby').GatsbyConfig}
 */
module.exports = {
  pathPrefix: "/My_profolio",
  siteMetadata: {
    title: "Hi, I'm Renzhong",
    description: 'web dev portfolio',
    copyright:'This website is copyright 2021 Web Renzhong',
    siteUrl: `https://www.yourdomain.tld`,
    contact:'renzhonglu22@gmail.com'
  },
  plugins: [
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `content`,
        path: `${__dirname}/src/content`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `projects`,
        path: `${__dirname}/src/projects`,
      },
    },
    {
      resolve: `gatsby-transformer-remark`,
      options: {
        plugins: [
          {
            resolve:"gatsby-remark-embed-video",
            options:{
              maxWidth:200,
              ratio:1.77,
              height:150,
              related:false,
              loadingStrategy:'lazy',
            }
          },
          // `gatsby-remark-embed-video`,
          {
            resolve: `gatsby-remark-images`,             options: {
              maxWidth: 300,
            },
          },
          `gatsby-remark-responsive-iframe`,
        ],
      },
    },
    `gatsby-plugin-image`,
    `gatsby-plugin-sharp`,
    `gatsby-transformer-sharp`, // Needed for dynamic images
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: `${__dirname}/src/images`,
      },
    },
    `gatsby-plugin-react-helmet`,
    `gatsby-plugin-sass`
   

  ],

}
