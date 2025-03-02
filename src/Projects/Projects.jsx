import { Link } from "react-router-dom";
import { useState } from "react";

function Projects() {
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
            {
              to: "/achievements",
              icon: "trophy-outline",
              label: "Achievements",
            },
            { to: "/projects", icon: "folder-outline", label: "Projects" },
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
            { to: "/achievements", icon: "trophy", label: "Achievements" },
            { to: "/projects", icon: "folder", label: "Projects" },
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
      {/* projects page content */}
      <div className="justify-evenly items-center mx-auto flex flex-row w-10/12">
        <Link
          to="/projects/blender"
          key="Blender"
          className="bg-neutral-800 w-60 h-130 flex items-center rounded-3xl justify-center drop-shadow-[0_0_7px_rgba(255,255,255,0.7)] hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.7)] transition-all duration-300"
        >
          <img src="./blender.png" className="size-20" />
        </Link>
        <div className="bg-neutral-800 w-60 h-130 flex items-center rounded-3xl justify-center drop-shadow-[0_0_7px_rgba(255,255,255,0.7)] hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.7)] transition-all duration-300">
          <img src="./unity.png" className="size-20" />
        </div>
        <div className="bg-neutral-800 w-60 h-130 flex items-center rounded-3xl justify-center drop-shadow-[0_0_7px_rgba(255,255,255,0.7)] hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.7)] transition-all duration-300">
          <img src="./py.png" className="size-20" />
        </div>
      </div>
    </div>
  );
}
export default Projects;
