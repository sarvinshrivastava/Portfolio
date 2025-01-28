import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Success() {
  const [count, setCount] = useState(5);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((prevCount) => {
        if (prevCount === 1) {
          clearInterval(timer);
          navigate("/");
        }
        return prevCount - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="justify-center items-center flex flex-col mx-auto h-screen">
      <h3 className="text-white text-3xl my-2.5">Success!</h3>
      <p className="text-white text-base my-2.5">Redirecting to homepage in</p>
      <p id="countdown" className="text-cyan-400 text-8xl my-2.5">
        {count}
      </p>
    </div>
  );
}
