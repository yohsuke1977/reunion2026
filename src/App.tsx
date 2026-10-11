import './index.css';
import Masthead from './components/Masthead';
import DeadlineBanner from './components/DeadlineBanner';
import Hero from './components/Hero';
import Greeting from './components/Greeting';
import SectionHeader from './components/SectionHeader';
import Details from './components/Details';
import AttendanceCounts from './components/AttendanceCounts';
import MemberList from './components/MemberList';
import RSVPForm from './components/RSVPForm';
import Voices from './components/Voices';
import AccountingNote from './components/AccountingNote';
import ShareSection from './components/ShareSection';
import LineBand from './components/LineBand';
import Footer from './components/Footer';
import { COMMENTS_PUBLIC, EVENT_DONE } from './config';

export default function App() {
  return (
    <div className="phone">
      <Masthead />
      <DeadlineBanner />
      <Hero />
      <Greeting />
      <SectionHeader no="01" title="会のご案内" en="INFORMATION" />
      <Details />
      {!EVENT_DONE && (
        <>
          <SectionHeader no="02" title="出欠のご連絡" en="RSVP" />
          <div id="rsvp">
            <AttendanceCounts />
            <MemberList />
            <RSVPForm />
          </div>
        </>
      )}
      <SectionHeader no={EVENT_DONE ? '02' : '03'} title="みんなの近況" en="VOICES" />
      <Voices />
      {COMMENTS_PUBLIC && (
        <div id="report">
          <SectionHeader no={EVENT_DONE ? '03' : '04'} title="会計報告" en="REPORT" />
          <AccountingNote />
        </div>
      )}
      {!EVENT_DONE && <ShareSection />}
      <LineBand />
      <Footer />
    </div>
  );
}
