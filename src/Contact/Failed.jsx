import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Failed() {
  const location = useLocation();
  const error = location.state?.error || "Unknown error occurred.";

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
      <h3 className="text-white text-3xl my-2.5">Failed!</h3>
      <span className="text-white text-base my-2.5">{error}</span>
      <p className="text-white text-base my-2.5">Redirecting to homepage in</p>
      <p className="text-cyan-400 text-8xl my-2.5">{count}</p>
    </div>
  );
}
