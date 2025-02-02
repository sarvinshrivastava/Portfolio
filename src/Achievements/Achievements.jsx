import { Link } from "react-router-dom";
import { useState } from "react";

function Achievements() {
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
      {/* side navigation bar */}
      {/* md+ */}
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
          className={`flex flex-col left-4.5 relative justify-between`}
        >
          <Link to="/" className="flex items-center relative">
            <div
              className="w-fit hover:scale-125 duration-300"
              onMouseEnter={() => handleMouseEnter("home-outline")}
              onMouseLeave={handleMouseLeave}
            >
              <ion-icon name={getIconName("home-outline")} size="large" />
            </div>
            <span
              className={`absolute left-10 text-white transition-opacity duration-300 text-lg ${
                isExpanded ? "opacity-100" : "opacity-0"
              }`}
            >
              Home
            </span>
          </Link>
          <Link to="/about" className="flex items-center relative">
            <div
              className="w-fit hover:scale-125 duration-300"
              onMouseEnter={() => handleMouseEnter("person-outline")}
              onMouseLeave={handleMouseLeave}
            >
              <ion-icon name={getIconName("person-outline")} size="large" />
            </div>
            <span
              className={`absolute left-10 text-white transition-opacity duration-300 text-lg ${
                isExpanded ? "opacity-100" : "opacity-0"
              }`}
            >
              About
            </span>
          </Link>
          <Link to="/achievements" className="flex items-center relative">
            <div
              className="w-fit hover:scale-125 duration-300"
              onMouseEnter={() => handleMouseEnter("trophy-outline")}
              onMouseLeave={handleMouseLeave}
            >
              <ion-icon name={getIconName("trophy-outline")} size="large" />
            </div>
            <span
              className={`absolute left-10 text-white transition-opacity duration-300 text-lg ${
                isExpanded ? "opacity-100" : "opacity-0"
              }`}
            >
              Achievements
            </span>
          </Link>
          <Link to="/projects" className="flex items-center relative">
            <div
              className="w-fit hover:scale-125 duration-300"
              onMouseEnter={() => handleMouseEnter("folder-outline")}
              onMouseLeave={handleMouseLeave}
            >
              <ion-icon name={getIconName("folder-outline")} size="large" />
            </div>
            <span
              className={`absolute left-10 text-white transition-opacity duration-300 text-lg ${
                isExpanded ? "opacity-100" : "opacity-0"
              }`}
            >
              Projects
            </span>
          </Link>
          <Link to="/contact" className="flex items-center relative">
            <div
              className="w-7 hover:scale-125 duration-300"
              onMouseEnter={() => handleMouseEnter("chatbubble-outline")}
              onMouseLeave={handleMouseLeave}
            >
              <ion-icon name={getIconName("chatbubble-outline")} size="large" />
            </div>
            <span
              className={`absolute left-10 text-white transition-opacity duration-300 text-lg ${
                isExpanded ? "opacity-100" : "opacity-0"
              }`}
            >
              Contact
            </span>
          </Link>
        </div>
        {/* <img
            src="./night-day.png"
            className="w-7 mt-15 hover:scale-125 duration-300 absolute left-5 bottom-24"
            style={{ bottom: `${pos_ham}px` }}
          /> */}
      </div>
      {/* sm */}
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
          className={`flex flex-col left-4.5 relative justify-between`}
        >
          <Link
            to="/"
            className={`flex items-center transition-opacity duration-300 ${
              isExpanded ? "opacity-100" : "opacity-0"
            }`}
          >
            <ion-icon name="home" size="large" />
            <span className="absolute left-10 text-white text-sm">Home</span>
          </Link>
          <Link
            to="/about"
            className={`flex items-center transition-opacity duration-300 ${
              isExpanded ? "opacity-100" : "opacity-0"
            }`}
          >
            <ion-icon name="person" size="large" />
            <span className="absolute left-10 text-white text-sm">About</span>
          </Link>
          <Link
            to="/achievements"
            className={`flex items-center transition-opacity duration-300 ${
              isExpanded ? "opacity-100" : "opacity-0"
            }`}
          >
            <ion-icon name="trophy" size="large" />
            <span className="absolute left-10 text-white text-sm">
              Achievements
            </span>
          </Link>
          <Link
            to="/projects"
            className={`flex items-center transition-opacity duration-300 ${
              isExpanded ? "opacity-100" : "opacity-0"
            }`}
          >
            <ion-icon name="folder" size="large" />
            <span className="absolute left-10 text-white text-sm">
              Projects
            </span>
          </Link>
          <Link
            to="/contact"
            className={`flex items-center transition-opacity duration-300 ${
              isExpanded ? "opacity-100" : "opacity-0"
            }`}
          >
            <ion-icon name="chatbubble" size="large" />
            <span className="absolute left-10 text-white text-sm">Contact</span>
          </Link>
        </div>
        {/* <img
            src="./night-day.png"
            className="w-7 mt-15 hover:scale-125 duration-300 absolute left-5 bottom-24"
            style={{ bottom: `${pos_ham}px` }}
          /> */}
      </div>
      {/* achievements page content */}
      <div className="justify-center items-center flex flex-col mx-auto">
        <h1 className="text-white text-4xl font-bold my-2">Achievements</h1>
        <h2 className="text-neutral-300 text-xl my-2">Adding Soon...</h2>
      </div>
    </div>
  );
}

export default Achievements;
