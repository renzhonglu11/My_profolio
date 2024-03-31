import React from "react";
import Navbar from "./Navbar";
import "../styles/global.css";
import { Helmet } from "react-helmet";
import { Button, Container } from "react-bootstrap";


export default function Layout(props) {
  return (
    <div className="layout">
      <Helmet>
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no"></meta>
      </Helmet>
      <Navbar></Navbar>
      <div className="content">{props.children}</div>
      <footer>
        <p>Copyright 2022 Renzhong</p>
      </footer>
    </div>
  );
}
