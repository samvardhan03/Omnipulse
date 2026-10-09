import HeroDctLoop from "@/components/HeroDctLoop";
import Eyebrow from "@/components/primitives/Eyebrow";

export default function IdentifierPreviewSection() {
  return (
    <section className="border-b border-[var(--rule)]">
      <div className="site-container grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-8 lg:gap-16 items-center">
        <div>
          <Eyebrow>Inside OmniLock</Eyebrow>
          <h2 className="font-display text-section font-medium mt-5">An identifier inside the signal.</h2>
          <p className="text-body text-[var(--ink-mute)] mt-5 max-w-[440px]">A closer look at the mid-band DCT coefficients explored by OmniLock. This concept animation illustrates the embedding and recovery goal.</p>
          <span className="hero-demo-tag inline-flex text-label font-semibold mt-5">In research · Concept preview</span>
        </div>
        <HeroDctLoop />
      </div>
    </section>
  );
}
