import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import "./index.css";
import Home from "./Home/Home.jsx";
import About from "./About/About.jsx";
import Achievements from "./Achievements/Achievements.jsx";
import Projects from "./Projects/Projects.jsx";
import Contact from "./Contact/Contact.jsx";
import Success from "./Contact/Success.jsx";
import Failed from "./Contact/Failed.jsx";

createRoot(document.getElementById("root")).render(
  <Router>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/achievements" element={<Achievements />} />
      <Route path="/Projects" element={<Projects />} />
      <Route path="/Contact" element={<Contact />} />
      <Route path="/Contact/Success" element={<Success />} />
      <Route path="/Contact/Failed" element={<Failed />} />
    </Routes>
  </Router>
);
