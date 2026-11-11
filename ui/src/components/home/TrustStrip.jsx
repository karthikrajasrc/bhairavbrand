import Icon from '../ui/Icon.jsx';
import Reveal from '../ui/Reveal.jsx';

const shoppingSteps = [
  {
    number: '01',
    title: 'Pick an aisle',
    text: 'Browse by category or search for the grocery already on your list.',
    icon: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4M8 10.5h5M10.5 8v5"/>',
  },
  {
    number: '02',
    title: 'Choose your pack',
    text: 'Check the available sizes and pick the one that suits your kitchen.',
    icon: '<path d="M7 3h10v4l2 2v12H5V9l2-2V3Zm0 4h10M9 12h6m-6 4h6"/>',
  },
  {
    number: '03',
    title: 'Build your basket',
    text: 'Add the things you need and keep browsing until your list feels complete.',
    icon: '<path d="M3 4h2l2.2 11h10.9L21 8H6M9 19h.01M17 19h.01M10 8v4m4-4v4"/>',
  },
];

export default function TrustStrip() {
  return (
    <section className="sec shop-guide">
      <div className="w">
        <Reveal className="cen shop-guide-heading">
          <span className="grocery-eyebrow">Your list, your pace</span>
          <h2>From browse to basket, made simple</h2>
          <p>A few easy steps to find the groceries that belong in your home.</p>
        </Reveal>
        <Reveal className="shop-steps rev-stagger">
          {shoppingSteps.map((step) => (
            <article className="shop-step" key={step.number}>
              <div className="shop-step-top">
                <span className="shop-step-number">{step.number}</span>
                <Icon d={step.icon} size={34} />
              </div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
