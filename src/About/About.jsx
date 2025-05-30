import { Link } from "react-router-dom";
import { useState } from "react";

function About() {
  // nav bar expansion and collapse
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  // icon fill on hover
  const [hoveredIcon, setIsHovered] = useState(false);
  const handleMouseEnter = (iconName) => {
    setIsHovered(iconName);
  };
  const handleMouseLeave = () => {
    setIsHovered(null);
  };
  const getIconName = (baseName) => {
    return hoveredIcon === baseName
      ? baseName.replace("-outline", "")
      : baseName;
  };

  // icon swap on click
  const [clickedIcon, setClickedIcon] = useState(null);
  const handleIconClick = (iconName) => {
    setClickedIcon(iconName);
  };
  const getName = (baseName) => {
    return clickedIcon === baseName ? "chevron-back" : baseName;
  };

  // dynamin positioning of elements
  const pos_ham = Math.round((window.innerHeight * 112) / 864);
  const pos_route = Math.round((window.innerHeight * 224) / 864);
  const spacing_route = Math.round((window.innerHeight * 425) / 864);

  return (
    <div className="flex flex-row h-screen">
      {/* Side Navigation Bar */}
      {/* For md+ screens */}
      <div
        className={`bg-neutral-800 hidden md:block absolute top-0 left-0 h-full ${
          isExpanded ? "w-48 left-0" : "w-18 -left-48"
        } flex flex-col duration-300 transition-all z-50`}
      >
        <div
          className="w-fit hover:scale-125 duration-300 cursor-pointer left-4.5 relative"
          style={{ top: `${pos_ham}px` }}
          onClick={toggleSidebar}
        >
          <ion-icon name="menu" size="large" />
        </div>
        <div
          style={{ top: `${pos_route}px`, height: `${spacing_route}px` }}
          className="flex flex-col left-4.5 relative justify-between"
        >
          {[
            { to: "/", icon: "home-outline", label: "Home" },
            { to: "/about", icon: "person-outline", label: "About" },
            // {
            //   to: "/achievements",
            //   icon: "trophy-outline",
            //   label: "Achievements",
            // },
            // { to: "/projects", icon: "folder-outline", label: "Projects" },
            { to: "/contact", icon: "chatbubble-outline", label: "Contact" },
          ].map(({ to, icon, label }) => (
            <Link to={to} className="flex items-center relative" key={label}>
              <div
                className="w-fit hover:scale-125 duration-300"
                onMouseEnter={() => handleMouseEnter(icon)}
                onMouseLeave={handleMouseLeave}
              >
                <ion-icon name={getIconName(icon)} size="large" />
              </div>
              <span
                className={`absolute left-10 text-white transition-opacity duration-300 text-lg ${
                  isExpanded ? "opacity-100" : "opacity-0"
                }`}
              >
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
      {/* For sm screens */}
      <div
        className={`bg-neutral-800 md:hidden absolute top-0 left-0 h-full ${
          isExpanded ? "w-1/2" : "w-0"
        } flex flex-col duration-300 z-40`}
      >
        <div
          className="w-fit hover:scale-125 duration-300 cursor-pointer left-4.5 relative"
          style={{ top: `${pos_ham}px` }}
          onClick={() => {
            toggleSidebar();
            handleIconClick(
              clickedIcon === "chevron-forward"
                ? "chevron-back"
                : "chevron-forward"
            );
          }}
        >
          <ion-icon name={getName("chevron-forward")} size="large" />
        </div>
        <div
          style={{ top: `${pos_route}px`, height: `${spacing_route}px` }}
          className="flex flex-col left-4.5 relative justify-between"
        >
          {[
            { to: "/", icon: "home", label: "Home" },
            { to: "/about", icon: "person", label: "About" },
            // { to: "/achievements", icon: "trophy", label: "Achievements" },
            // { to: "/projects", icon: "folder", label: "Projects" },
            { to: "/contact", icon: "chatbubble", label: "Contact" },
          ].map(({ to, icon, label }) => (
            <Link
              to={to}
              className={`flex items-center transition-opacity duration-300 ${
                isExpanded ? "opacity-100" : "opacity-0"
              }`}
              key={label}
            >
              <ion-icon name={icon} size="large" />
              <span className="absolute left-10 text-white text-sm">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
      {/* About Page Content */}
      <div className="justify-center items-center flex flex-col-reverse lg:flex-row mx-auto">
        <div className="flex flex-col w-11/12 lg:w-2xl lg:mr-5.5">
          <h2 className="text-white text-2xl w-10/12 mx-auto font-bold md:w-full lg:text-4xl my-3.5 text-left">
            Who I Am
          </h2>
          <p className="text-neutral-300 text-sm w-10/12 mx-auto md:w-full lg:text-lg text-left">
            I am a pre-final year B.Tech student in Computer Science and
            Engineering at KIET Group of Institutions Delhi NCR, specializing in
            AR technology. With hands-on experience as an AR-VR Lead at
            Technocrats and having completed an internship at NEC India, I am
            passionate about creating immersive experiences that solve complex
            problems.
          </p>
          <h4 className="text-white text-xl font-semibold w-10/12 mx-auto md:w-full lg:text-2xl mt-4.5 my-2.5 text-left">
            Skills
          </h4>
          <div className="flex flex-row flex-wrap mx-auto">
            {[
              { src: "./unity.png", label: "Unity" },
              { src: "./blender.png", label: "Blender" },
              { src: "./arcore.png", label: "AR-Core" },
              { src: "./cpp.png", label: "C++" },
              { src: "./cs.png", label: "C-Sharp" },
              { src: "./py.png", label: "Python" },
              { src: "./vuforia.png", label: "Vuforia" },
              { src: "./github.png", label: "Github" },
              { src: "./figma.png", label: "Figma" },
            ].map(({ src, label }) => (
              <div
                className="flex flex-row py-2 px-3.5 rounded-lg bg-neutral-700 w-fit m-[3px]"
                key={label}
              >
                <img src={src} className="size-5 mr-1.5 my-auto" alt={label} />
                <p className="text-neutral-300 font-semibold text-sm lg:text-base">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
        <img
          src="./Profile Pic.png"
          alt="Profile"
          className="size-[12rem] md:size-[19rem] lg:size-[24rem]"
        />
      </div>
    </div>
  );
}

export default About;
