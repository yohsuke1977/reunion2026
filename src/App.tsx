import './index.css';
import Masthead from './components/Masthead';
import Hero from './components/Hero';
import Greeting from './components/Greeting';
import SectionHeader from './components/SectionHeader';
import Details from './components/Details';
import RSVPForm from './components/RSVPForm';
import Voices from './components/Voices';
import ShareSection from './components/ShareSection';
import LineBand from './components/LineBand';
import Footer from './components/Footer';

export default function App() {
  return (
    <div className="phone">
      <Masthead />
      <Hero />
      <Greeting />
      <SectionHeader no="01" title="会のご案内" en="INFORMATION" />
      <Details />
      <SectionHeader no="02" title="出欠のご連絡" en="RSVP" />
      <RSVPForm />
      <SectionHeader no="03" title="みんなの近況" en="VOICES" />
      <Voices />
      <ShareSection />
      <LineBand />
      <Footer />
    </div>
  );
}
