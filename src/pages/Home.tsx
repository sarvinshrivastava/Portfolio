import { Hero } from '../components/sections/Hero';
import { About } from '../components/sections/About';
import { Connect } from '../components/sections/Connect';

export function Home() {
  return (
    <main id="main">
      <Hero />
      <About />
      <Connect />
    </main>
  );
}
