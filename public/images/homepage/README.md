# Homepage Lifestyle Images

Add your study/lifestyle imagery here to replace placeholder gradients.

## How to enable

1. Add image files to this folder.
2. Edit `src/components/landing/LandingLifestyleImages.tsx` and pass the paths:

```tsx
// Example: enable study-laptop image
<HomepageImageFeature
  imageSrc="/images/homepage/study-laptop.jpg"
  title="Study anywhere"
  description="..."
/>
```

If `imageSrc` is omitted, a polished gradient placeholder is shown.

## Recommended assets

| File | Use | Suggested content |
|------|-----|-------------------|
| `study-laptop.jpg` | Study anywhere section | Student with laptop, café or library setting |
| `study-mobile.jpg` | Card 2 | Learner using phone/tablet on the go |
| `study-classroom.jpg` | Card 3 | Classroom or independent study vibe |
| `phone.jpg` | Phone mockup | App screenshot or study UI on phone |
| `tablet.jpg` | Tablet mockup | App screenshot or study UI on tablet |
| `desktop.jpg` | Desktop mockup | Dashboard or practice UI on desktop |
| `why-choose-device.jpg` | Why Choose card 1 | Multi-device study (phone + laptop) |
| `why-choose-adaptive.jpg` | Why Choose card 2 | Adaptive practice / progress visualization |
| `why-choose-jade.jpg` | Why Choose card 3 | Jade Tutor / AI study assistant |

## Specs

- **Format**: JPG or WebP (recommended for smaller file size)
- **Aspect ratios**:
  - `study-laptop.jpg`, `study-mobile.jpg`, `study-classroom.jpg`: 4:3 (e.g. 1200×900)
  - `why-choose-device.jpg`, `why-choose-adaptive.jpg`, `why-choose-jade.jpg`: 4:3
  - `phone.jpg`: 9:19 (portrait)
  - `tablet.jpg`: 4:3
  - `desktop.jpg`: 16:10
- **Size**: Optimize for web (e.g. 1200–1600px on longest side)
- **Style**: Premium, aspirational, nursing/healthcare education. Avoid stock-photo clichés.

## Why Choose section

To enable images for "Why learners choose Xentis Care", add the files above and edit `src/components/landing/LandingWhyChoose.tsx` to pass `imageSrc` for each card:

```tsx
{
  imageSrc: "/images/homepage/why-choose-device.jpg",
  title: "Study on every device",
  ...
}
```
