import { Link } from "react-router-dom";

function Achievements() {
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
            />
          </Link>
          <Link to="/about">
            <img
              src="/src/assets/logo/user.png"
              className="w-7 hover:scale-125 duration-300"
            />
          </Link>
          <Link to="/achievements">
            <img
              src="/src/assets/logo/trophy.png"
              className="w-7 hover:scale-125 duration-300"
            />
          </Link>
          <Link to="/projects">
            <img
              src="/src/assets/logo/computer.png"
              className="w-7 hover:scale-125 duration-300"
            />
          </Link>
          <Link to="/contact">
            <img
              src="/src/assets/logo/edit.png"
              className="w-7 hover:scale-125 duration-300"
            />
          </Link>
          <img
            src="/src/assets/logo/night-day.png"
            className="w-7 mt-15 hover:scale-125 duration-300"
          />
        </div>
      </div>
      {/*  page content */}
      <div className="justify-center items-center flex flex-col mx-auto"></div>
    </div>
  );
}

export default Achievements;
