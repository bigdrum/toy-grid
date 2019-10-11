import * as React from "react";
import { render } from "react-dom";
import { MyGrid } from "./grid";

import "./styles.css";

function App() {
  return (
    <div style={{ height: "100%", marginLeft: 10, marginRight: 10 }}>
      <MyGrid />
    </div>
  );
}

const rootElement = document.getElementById("root");
render(<App />, rootElement);
