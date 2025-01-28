import { useRef } from "react";
import emailjs from "@emailjs/browser";
import { Link, useNavigate } from "react-router-dom";

function Contact() {
  const path = "/src/assets/logo/";

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

  return (
    <div className="flex flex-row h-screen items-center">
      {/* side navigation bar */}
      <div className="bg-neutral-800 h-full w-[60px] flex items-center">
        <div className="flex flex-col w-fit mx-auto space-y-12 justify-center">
          <img
            src={`${path}menu-burger.png`}
            className="w-7 mb-15 hover:scale-125 duration-300"
          />
          <Link to="/">
            <img
              src={`${path}home.png`}
              className="w-7 hover:scale-125 duration-300"
            />
          </Link>
          <Link to="/about">
            <img
              src={`${path}user.png`}
              className="w-7 hover:scale-125 duration-300"
            />
          </Link>
          <Link to="/achievements">
            <img
              src={`${path}trophy.png`}
              className="w-7 hover:scale-125 duration-300"
            />
          </Link>
          <Link to="/projects">
            <img
              src={`${path}computer.png`}
              className="w-7 hover:scale-125 duration-300"
            />
          </Link>
          <Link to="/contact">
            <img
              src={`${path}edit.png`}
              className="w-7 hover:scale-125 duration-300"
            />
          </Link>
          <img
            src={`${path}night-day.png`}
            className="w-7 mt-15 hover:scale-125 duration-300"
          />
        </div>
      </div>
      {/* contact page content */}
      <div className="justify-center items-center flex flex-col mx-auto">
        <h3 className="text-white text-2xl my-2.5">Get in Touch</h3>
        <form className="flex flex-col" onSubmit={sendEmail} ref={form}>
          <input
            type="text"
            placeholder="Name"
            className="border-2 border-neutral-500 rounded-lg p-2 m-2"
            name="name"
            required
          />
          <input
            type="email"
            placeholder="Email"
            className="border-2 border-neutral-500 rounded-lg p-2 m-2"
            name="email"
            required
          />
          <textarea
            placeholder="Message"
            className="border-2 border-neutral-500 rounded-lg p-2 m-2"
            name="message"
            required
          ></textarea>
          <button
            type="submit"
            className="bg-cyan-400 text-white w-fit mx-auto my-2 py-1.5 px-4 rounded-lg hover:bg-cyan-500 hover:scale-115 duration-300"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default Contact;
