const path = require('path')

exports.createPages = async ({ graphql, actions }) => {

  const result = await graphql(`
    query Articles {
      allMarkdownRemark {
        nodes {
          frontmatter {
            slug
          }
        }
      }
    }
  `)

  result.data.allMarkdownRemark.nodes.forEach(node => {
    actions.createPage({
      path: '/projects/'+ node.frontmatter.slug+'/',
      component: path.resolve('./src/templates/project-details.js'),
      context: { slug: node.frontmatter.slug }
    })
  })

}