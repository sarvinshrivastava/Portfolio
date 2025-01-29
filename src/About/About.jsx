import { Link } from "react-router-dom";

function About() {
  return (
    <div className="flex flex-row h-screen items-center">
      {/* side navigation bar */}
      <div className="bg-neutral-800 h-full w-[60px] flex items-center">
        <div className="flex flex-col w-fit mx-auto space-y-12 justify-center">
          <img
            src="./menu-burger.png"
            className="w-7 mb-15 hover:scale-125 duration-300"
            title="menu"
          />
          <Link to="/">
            <img
              src="./home.png"
              className="w-7 hover:scale-125 duration-300"
              title="home"
            />
          </Link>
          <Link to="/about">
            <img
              src="./user.png"
              className="w-7 hover:scale-125 duration-300"
              title="about"
            />
          </Link>
          {/* <Link to="/achievements">
            <img
              src="./trophy.png"
              className="w-7 hover:scale-125 duration-300"
              title="trophy"
            />
          </Link>
          <Link to="/projects">
            <img
              src="./computer.png"
              className="w-7 hover:scale-125 duration-300"
              title="projects"
            />
          </Link>
          <Link to="/contact">
            <img
              src="./edit.png"
              className="w-7 hover:scale-125 duration-300"
              title="contact"
            />
          </Link> */}
          <img
            src="./night-day.png"
            className="w-7 mt-15 hover:scale-125 duration-300"
            title="night-day"
          />
        </div>
      </div>
      {/* about page content */}
      <div className="justify-center items-center flex flex-row mx-auto">
        <div className="flex flex-col w-2xl mr-5.5">
          <h2 className="text-white text-4xl my-3.5 text-left">Who I am</h2>
          <p className="text-neutral-300 text-lg text-left">
            I&apos;m a pre-final year B.Tech student in Computer Science and
            Engineering at KIET Group of Institutions Delhi NCR, specializing in
            AR technology. With hands-on experience as an AR-VR Lead at
            Technocrats and having completed an internship at NEC India. I am
            passionate about creating immersive experience which solve complex
            problems.
          </p>
          <h4 className="text-white text-2xl mt-4.5 my-2.5 text-left">
            Skills
          </h4>
          <div className="flex flex-row flex-wrap">
            <div className="flex flex-row py-2 px-3 5 rounded-lg bg-neutral-700 w-fit my-1.5">
              <img src="./unity.png" className="w-6.5 mr-1.5" />
              <p className="text-neutral-300 font-semibold">Unity</p>
            </div>
            <div className="flex flex-row py-2 px-3 5 rounded-lg bg-neutral-700 w-fit m-1.5">
              <img src="./blender.png" className="w-6.5 mr-1.5" />
              <p className="text-neutral-300 font-semibold">Blender</p>
            </div>
            <div className="flex flex-row py-2 px-3 5 rounded-lg bg-neutral-700 w-fit my-1.5">
              <img src="./arcore.png" className="w-6.5 mr-1.5" />
              <p className="text-neutral-300 font-semibold">AR-Core</p>
            </div>
            <div className="flex flex-row py-2 px-3 5 rounded-lg bg-neutral-700 w-fit m-1.5">
              <img src="./cpp.png" className="w-6.5 mr-1.5" />
              <p className="text-neutral-300 font-semibold">C++</p>
            </div>
            <div className="flex flex-row py-2 px-3 5 rounded-lg bg-neutral-700 w-fit my-1.5">
              <img src="./cs.png" className="w-6.5 mr-1.5" />
              <p className="text-neutral-300 font-semibold">C-Sharp</p>
            </div>
            <div className="flex flex-row py-2 px-3 5 rounded-lg bg-neutral-700 w-fit m-1.5">
              <img src="./py.png" className="w-6.5 mr-1.5" />
              <p className="text-neutral-300 font-semibold">Python</p>
            </div>
            <div className="flex flex-row py-2 px-3 5 rounded-lg bg-neutral-700 w-fit">
              <img src="./vuforia.png" className="w-6.5 mr-1.5" />
              <p className="text-neutral-300 font-semibold">Vuforia</p>
            </div>
            <div className="flex flex-row py-2 px-3 5 rounded-lg bg-neutral-700 w-fit mx-1.5">
              <img src="./github.png" className="w-6.5 mr-1.5" />
              <p className="text-neutral-300 font-semibold">Github</p>
            </div>
            <div className="flex flex-row py-2 px-3 5 rounded-lg bg-neutral-700 w-fit">
              <img src="./figma.webp" className="h-6 mr-1.5" />
              <p className="text-neutral-300 font-semibold">Figma</p>
            </div>
          </div>
        </div>
        <img src="./Profile Pic.png" alt="" />
      </div>
    </div>
  );
}

export default About;
