import React from "react";
import Layout from "../../components/Layout";
import { graphql, Link } from "gatsby";
import { portfolio, projects } from "../../styles/projects.module.css";

export default function Projects(props) {
  console.log(props.data);
  const projectsData = props.data.projects.nodes;
  const contact = props.data.contact.siteMetadata.contact;

  return (
    <Layout>
      <div className={portfolio}>
        <h2>Portfolio</h2>
        <h3>test</h3>
        <div className={projects}>
          {projectsData.map(project => (
            <Link to={"/projects/" + project.frontmatter.slug} key={project.id}>
              <div>
                <h3>
                  {project.frontmatter.title}
                  <p>{project.frontmatter.stack}</p>
                </h3>
              </div>
            </Link>
          ))}
        </div>
        <p>Email me at {contact}!</p>
      </div>
    </Layout>
  );
}

// export page query
export const query = graphql`
  query MyQuery {
    projects: allMarkdownRemark(sort: { frontmatter: { date: DESC } }) {
      nodes {
        frontmatter {
          title
          stack
          slug
          date
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
