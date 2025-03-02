import { Link } from "react-router-dom";

function Blender() {
  const iconStyle = {
    fontSize: "1.75rem",
    padding: "0.75rem",
  };
  return (
    <>
      <Link to="/projects" key="Blender">
        <ion-icon name="arrow-back" style={iconStyle}></ion-icon>
      </Link>
      <div className="flex flex-col items-center justify-center">
        <div>
          {/* <h2>Arc Reactor</h2>
          <p>A simple model of the Arc React</p> */}
          Adding Soon!
        </div>
      </div>
    </>
  );
}

export default Blender;
