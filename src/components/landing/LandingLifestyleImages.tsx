"use client";

import { HomepageImageFeature } from "./HomepageImageFeature";
import { HomepageImageCardGrid } from "./HomepageImageCardGrid";
import { HomepageShowcaseSection } from "./HomepageShowcaseSection";

/**
 * Lifestyle imagery sections for the public homepage.
 * Place images in /public/images/homepage/ and pass paths below.
 * Omit imageSrc to use placeholders. See public/images/homepage/README.md for asset specs.
 */
export function LandingLifestyleImages() {
  return (
    <>
      {/* Study anywhere - laptop/study vibe */}
      <HomepageImageFeature
        title="Study anywhere"
        description="Café, library, or home—your prep travels with you. Practice questions, flashcards, and Jade Tutor work seamlessly on any device. No more lugging heavy books or losing your place."
      />

      {/* Built for modern learners - 3 lifestyle cards */}
      <HomepageImageCardGrid
        title="Built for modern learners"
        subtitle="Real students. Real progress. Premium nursing exam prep."
        cards={[
          {
            title: "Deep focus sessions",
            description: "Dedicated study time with adaptive questions and blueprint-aligned content.",
            placeholderIcon: "laptop",
            gradient: "violet",
          },
          {
            title: "Learn on the go",
            description: "Squeeze in practice during commutes, breaks, or between shifts.",
            placeholderIcon: "smartphone",
            gradient: "cyan",
          },
          {
            title: "Independent & confident",
            description: "Study at your pace. Classroom vibes without the pressure.",
            placeholderIcon: "users",
            gradient: "teal",
          },
        ]}
      />

      {/* From phone to desktop - device showcase */}
      <HomepageShowcaseSection />
    </>
  );
}
