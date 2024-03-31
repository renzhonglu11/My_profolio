import React from "react";
import Layout from "../components/Layout";
import { graphql } from "gatsby";
import { GatsbyImage, getImage } from "gatsby-plugin-image";
import { details, featured, html } from "../styles/project-details.module.css";

export default function Portfolio(props) {
  const { html } = props.data.markdownRemark;
  const { title, stack, featuredImg } = props.data.markdownRemark.frontmatter;

  return (
    <Layout>
      <div className={details}>
        <h1>{title}</h1>
        {/* <h3>{stack}</h3> */}
        <div className={featured}>
          <GatsbyImage
            image={featuredImg.childImageSharp.gatsbyImageData}
            alt=""
            
          ></GatsbyImage>
        </div>
        <div className={html} dangerouslySetInnerHTML={{ __html: html } }></div>
      </div>
    </Layout>
  );
}

export const query = graphql`
  query ProrojeectPages {
    markdownRemark(frontmatter: { slug: { eq: "cv" } }) {
      html
      frontmatter {
        stack
        title
        featuredImg {
          childImageSharp {
            gatsbyImageData(layout: CONSTRAINED,height:250)
          }
        }
      }
    }
  }
`;
