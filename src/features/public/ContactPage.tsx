import "./public-pages.css";

const contactEmail = "hello@getoppsift.com";

export function ContactPage() {
  return (
    <div className="public-page public-page--editorial">
      <header className="editorial-hero">
        <p className="public-section__eyebrow">Contact</p>
        <h1>Let’s talk about opportunity intelligence.</h1>
        <p>
          For product and general enquiries, contact the OppSift team by email.
        </p>
      </header>
      <main className="public-section editorial-content">
        <section className="contact-panel">
          <span>General enquiries</span>
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
          <p>Your email application will open with the OppSift address.</p>
        </section>
      </main>
    </div>
  );
}
