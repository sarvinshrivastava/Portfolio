import { Link } from "react-router-dom";

import "./Home.css";

function Home() {
  return (
    <div className="flex flex-row h-screen items-center">
      {/* side navigation bar */}
      <div className="bg-neutral-800 h-full w-[60px] flex items-center">
        <div className="flex flex-col w-fit mx-auto space-y-12 justify-center">
          <img
            src="/src/assets/logo/menu-burger.png"
            className="w-7 mb-15 hover:scale-125 duration-300"
          />
          <Link to="/">
            <img
              src="/src/assets/logo/home.png"
              className="w-7 hover:scale-125 duration-300"
              title="home"
            />
          </Link>
          <Link to="/about">
            <img
              src="/src/assets/logo/user.png"
              className="w-7 hover:scale-125 duration-300"
              title="about"
            />
          </Link>
          <Link to="/achievements">
            <img
              src="/src/assets/logo/trophy.png"
              className="w-7 hover:scale-125 duration-300"
              title="achievements"
            />
          </Link>
          <Link to="/projects">
            <img
              src="/src/assets/logo/computer.png"
              className="w-7 hover:scale-125 duration-300"
              title="projects"
            />
          </Link>
          <Link to="/contact">
            <img
              src="/src/assets/logo/edit.png"
              className="w-7 hover:scale-125 duration-300"
              title="contact"
            />
          </Link>
          <img
            src="/src/assets/logo/night-day.png"
            className="w-7 mt-15 hover:scale-125 duration-300"
          />
        </div>
      </div>
      {/* home page content */}
      <div className="justify-center items-center flex flex-col mx-auto">
        <img
          src="/src/assets/avatar/My Avatar.jpeg"
          className="rounded-full w-44"
        />
        <h1 className="text-3xl font-bold my-8.5">
          Hi! I am{" "}
          <a
            href="/src/assets/resume/Sarvin Shrivastava.pdf"
            target="_blank"
            className="name-underline"
          >
            Sarvin Shrivastava
          </a>
        </h1>
        <div className="px-4 py-1.5 bg-cyan-500 rounded-xl text-lg">
          <Link to="/contact">
            <h6>Let&apos;s Connect</h6>
          </Link>
        </div>
        <div className="flex flex-row w-full mx-auto space-x-7 justify-center mt-7">
          <a href="https://github.com/sarvinshrivastava" target="_blank">
            <img src="/src/assets/logo/github.png" className="w-8" />
          </a>
          <a
            href="https://www.linkedin.com/in/sarvin-shrivastava-493b20176/"
            target="_blank"
          >
            <img src="/src/assets/logo/linkedin.png" className="w-8" />
          </a>
          <img
            src="/src/assets/logo/call.png"
            className="w-8 cursor-pointer"
            onClick={() => {
              navigator.clipboard.writeText("+91-9310524050");
              alert("Copied to clipboard!");
            }}
          />
          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=sarvin5124@gmail.com"
            target="_blank"
          >
            <img src="/src/assets/logo/mail.png" className="w-8" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default Home;
