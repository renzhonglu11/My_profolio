import { Link, graphql, useStaticQuery } from "gatsby";
import React from "react";
import { Container } from "react-bootstrap";
import "../../node_modules/bootstrap/dist/css/bootstrap.min.css";
import "../styles/customed.css";

// const headingStyles = {
//   marginTop: 0,
//   marginBottom: 30,
//   maxWidth: 400,
// };
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
    //     <nav>
    //       <h1 style={headingStyles}>
    //         {title}
    //         <br />
    //         <span style={headingAccentStyles}>
    //           — a computer science student in university paderborn
    //         </span>
    //       </h1>

    //       {/* <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavAltMarkup" aria-controls="navbarNavAltMarkup" aria-label="Toggle navigation">
    //       <span class="navbar-toggler-icon"></span>
    //     </button> */}
    //       {/* <div class="collapse navbar-collapse" id="navbarNavAltMarkup"> */}
    //       <div class="navbar-nav ml-auto">
    //         <Link to="/">Home</Link>
    //         <Link to="/portfolio">Portfolio</Link>
    //         <Link to="/projects">Projects/Blog</Link>
    //       </div>
    //       {/* </div> */}
    //       {/* <div id='my-links'>
    //         <Link to="/">Home</Link>
    //         <Link to="/portfolio">Portfolio</Link>
    //         <Link to="/projects">Projects/Blog</Link>
    //       </div> */}
    //        {/* <button class = "navbar-toggler"
    //         type="button"
    //         data-bs-toggle="collapse"
    //         data-bs-target="#navbarNavAltMarkup"
    //         aria-controls="navbarNavAltMarkup"
    //         aria-label="Toggle navigation"
    //       >
    //         <span class="navbar-toggler-icon"></span>
    //       </button> */}
    // {/*
    //       <div className="collapse navbar-collapse" id="navbarNavAltMarkup">
    //         <div className="navbar-nav ml-auto">
    //           <a class="nav-link">Home</a>
    //           <a class="nav-link">Portfolio</a>
    //           <a class="nav-link">Projects/Blog</a>
    //         </div>
    //       </div> */}
    //     </nav>

    <header class="container">
      <nav class="navbar  navbar-expand-lg customed-nav">
        <h1 class="customed-h1">
          {title}
          <br />
          <span style={headingAccentStyles}>
            — a computer science student in university paderborn
          </span>
        </h1>
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarTogglerDemo03"
          aria-controls="navbarTogglerDemo03"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navbarTogglerDemo03">

        <div class="navbar-nav ms-auto">
            <Link class="nav-link"  to="/">
              Home
            </Link>
            <Link class="nav-link" to="/portfolio">
              Portfolio
            </Link>
            <Link class="nav-link" to="/projects">
              Projects/Blog
            </Link>
          </div> 
        </div>
      </nav>
    </header>
  );
}
