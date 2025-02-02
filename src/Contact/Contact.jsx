import { useRef, useState } from "react";
import emailjs from "@emailjs/browser";
import { Link, useNavigate } from "react-router-dom";

function Contact() {
  // emailjs form submission
  const form = useRef();
  const navigate = useNavigate();

  const sendEmail = (e) => {
    e.preventDefault();

    emailjs
      .sendForm("service_2hz6tjs", "template_gezwadr", form.current, {
        publicKey: "Ptirjeddr_GaW0DSq",
      })
      .then(
        () => {
          console.log("SUCCESS!");
          navigate("/contact/success");
        },
        (error) => {
          console.log("FAILED...", error.text);
          navigate("/contact/failed", { state: { error: error.text } });
        }
      );
  };

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
      {/* contact page content */}
      <div className="justify-center items-center flex flex-col-reverse lg:flex-row w-full mx-auto">
        <div className="flex flex-col w-9/12 md:w-fit">
          <h3 className="text-white text-xl md:text-3xl text-left font-semibold mb-0.5">
            Get in Touch
          </h3>
          <p className="text-neutral-300 text-sm text-left w-full mb-3 md:mb-4.5">
            Let&apos;s discuss how my expertise can be of assistance to you.
          </p>
          <form className="flex flex-col" onSubmit={sendEmail} ref={form}>
            <div className="flex flex-row">
              <div className="flex flex-col md:flex-col">
                <label htmlFor="fname">Name</label>
                <input
                  type="text"
                  placeholder="First Name"
                  className="border-2 border-neutral-500 rounded-md p-2 my-2 w-full md:w-44"
                  id="fname"
                  required
                />
              </div>
              <div className="ml-9 flex flex-col">
                <label htmlFor="lname">Last Name</label>
                <input
                  type="text"
                  placeholder="Last Name"
                  className="border-2 border-neutral-500 rounded-md p-2 my-2 w-full"
                  id="lname"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                placeholder="Email"
                className="border-2 border-neutral-500 w-full rounded-md p-2 my-2"
                id="email"
                required
              />
            </div>
            <label htmlFor="message">Message</label>
            <textarea
              placeholder="Message"
              className="border-2 border-neutral-500 w-full rounded-lg p-2 my-2"
              id="message"
              required
            ></textarea>
            <button
              type="submit"
              className="bg-cyan-400 text-white w-full mx-auto my-2 py-1.5 px-4 rounded-lg hover:bg-cyan-600 duration-300"
            >
              Send
            </button>
          </form>
        </div>
        <div className="w-full lg:w-fit">
          <img
            src="./Handshake Image.png"
            className=" mx-auto size-[10rem] mb-5 md:size-[18rem] lg:mb-0 lg:ml-10.5 lg:size-[20rem]"
          />
        </div>
      </div>
    </div>
  );
}

export default Contact;
