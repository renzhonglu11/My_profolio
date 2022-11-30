import { Link, graphql, useStaticQuery } from "gatsby";
import React from "react";

const headingStyles = {
  marginTop: 0,
  marginBottom: 64,
  maxWidth: 400,
};
const headingAccentStyles = {
  color: "rgb(175 95 255)",
};

export default function Navbar() {
  const data = useStaticQuery(graphql`
    query SiteInfo {
      site {
        siteMetadata {
          title
        }
      }
    }
  `);

  const { title } = data.site.siteMetadata;

  return (
    <nav>
      <h1 style={headingStyles}>
        {title}
        <br />
        <span style={headingAccentStyles}>
          — a computer science student in university paderborn
        </span>
      </h1>
      <div className="links">
        <Link to="/">Home</Link>
        <Link to="/portfolio">Portfolio</Link>
        <Link to="/projects">Projects</Link>
      </div>
    </nav>
  );
}
