import EventTypeSelector from "./EventTypeSelector";
import MainDescription from "./MainDescription";
import ReceptionTable from "./ReceptionTable";
import AccordionHeader from "./AccordionHeader";
import HowItWorks from "./HowItWorks";
import SmsAutomationSection from "./SmsAutomationSection";
import FaqSection from "./FaqSection";
import SecurityPrivacySection from "./SecurityPrivacySection";
import IntegrationsSection from "./IntegrationsSection";

const HeroSection = () => {
  return (
    <>
      <section className="">
        <MainDescription />
        <HowItWorks />
        {/*       
        <SmsAutomationSection
          event={{
            eventType: "חתונה",
            groomFirst: "דני",
            groomLast: "כהן",
            brideFirst: "שרית",
            brideLast: "לוי",
            date: "2025-10-22",
            time: "20:00",
            venue: "אולם גן עדן",
            address: "הפרדס 12, ראשון לציון",
            wazeLink: "https://waze.com/ul/...",
            googleMapsLink: "https://maps.google.com/...",
            isCanceled: undefined,
            cancelReason: undefined,
            preferences: undefined,
          }}
          sampleGuest={{
            _id: "",
            name: "משה ישראלי",
            phone: "+972501234567",
            table: "14",
            status: "לא ענה",

            count: undefined,
            smsCount: 0,
            lastSms: "",
            eventId: undefined,
          }}
        />
         */}
        <FaqSection />
        <EventTypeSelector />
        {/* <AccordionHeader
          title="שולחן קבלת פנים דיגיטלי"
          subTitle="באפשרותכם להזמין שולחן קבלה דיגיטלי"
        /> */}
        <ReceptionTable />
        {/* <SecurityPrivacySection
          className="mt-8"
          lastUpdated="ספטמבר 2025"
          privacyHref="/privacy" // עדכן לנתיב בפועל
          dpaHref="/contactus" // או עמוד בקשת DPA ייעודי
        /> */}

        {/* <IntegrationsSection className="mt-8" showUpcoming={true} /> */}
      </section>
    </>
  );
};

export default HeroSection;
