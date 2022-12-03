import React from "react";
import Layout from "../../components/Layout";
import { graphql, Link } from "gatsby";
import { portfolio, projects } from "../../styles/projects.module.css";
import { GatsbyImage, getImage } from "gatsby-plugin-image";

export default function Projects(props) {

  const projectsData = props.data.projects.nodes;
  const contact = props.data.contact.siteMetadata.contact;
  return (
    <Layout>
      <div className={portfolio}>
        <h2>Portfolio</h2>
        <h3>test</h3>
        <div className={projects}>
          {projectsData.map(project => {
            console.log(
              project.frontmatter.thumb.childrenImageSharp[0].gatsbyImageData
            );
            const projectImg = getImage(project.frontmatter.thumb?.childrenImageSharp?.GatsbyImage.gatsbyImageData)
            return (
              <Link
                to={"/projects/" + project.frontmatter.slug}
                key={project.id}
              >
                <div>
                  <GatsbyImage
                    image={
                      project.frontmatter.thumb.childrenImageSharp[0]
                        .gatsbyImageData
                    }
                    alt=""
                  ></GatsbyImage>
                  <h3>
                    {project.frontmatter.title}
                    <p>{project.frontmatter.stack}</p>
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>
        <p>Email me at {contact}!</p>
      </div>
    </Layout>
  );
}

// export page query
export const query = graphql`
  query MyQuery {
    projects: allMarkdownRemark {
      nodes {
        frontmatter {
          title
          stack
          slug
          date
          thumb {
            childrenImageSharp {
              gatsbyImageData(layout: CONSTRAINED)
            }
          }
        }
        id
      }
    }
    contact: site {
      siteMetadata {
        contact
      }
    }
  }
`;
