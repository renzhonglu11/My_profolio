import React from "react";
import Layout from "../components/Layout";
import { GatsbyImage, getImage } from "gatsby-plugin-image";
import { details, featured, html } from "../styles/project-details.module.css";
import { graphql } from "gatsby";
import Video from "../components/Video";

export default function ProjectDetails(props) {
  const {html} = props.data.markdownRemark
  const{title,stack,featuredImg} = props.data.markdownRemark.frontmatter
  console.log(featuredImg.childImageSharp.gatsbyImageData);

  return (
    <Layout>
      <div className={details}>
        <h1>{title}</h1>
        {/* <h3>{stack}</h3> */}
        <div className={featured}><GatsbyImage image={featuredImg.childImageSharp.gatsbyImageData} alt='' ></GatsbyImage></div>
        <div className={html} dangerouslySetInnerHTML={{__html:html}}>
      </div>
      {title=='Projects of university'?<Video
        videoSrcURL="https://www.youtube.com/embed/HrIaxUHXfxk"
        videoTitle="Ball on plate"
      />:``}

      </div>
    </Layout>
  );
}

export const query = graphql`
  query ProrojeectPages($slug: String) {
    markdownRemark(frontmatter: { slug: { eq: $slug } }) {
      html
      frontmatter {
        stack
        title
        featuredImg {
          childImageSharp {
            gatsbyImageData(layout: CONSTRAINED,height:200,width:1200)
          }
        }
      }
    }
  }
`;

