import { db } from "../src/config/database.ts";
import { siteSettings } from "../src/entities/siteSettings/siteSetting.model.ts";
import { eq } from "drizzle-orm";

/**
 * Seed site settings with NBM default data
 * This creates all the site configuration settings needed for the frontend
 */

const defaultSettings = [
  // Site Info
  {
    key: "site_info",
    category: "general",
    value: {
      siteName: "Never Before Marketing",
      tagline: "Elevate Your Brand with Stunning Visuals",
      description: "Professional motion graphics and animation services",
      logo: "/assets/logo.svg",
      favicon: "/assets/favicon.ico",
    },
    isPublic: true,
    description: "Basic site information displayed in header and meta tags",
  },

  // Contact Info
  {
    key: "contact_info",
    category: "general",
    value: {
      email: "hello@neverbeforemarketing.com",
      phone: "+1 (555) 123-4567",
      address: "123 Creative Street, Design City, DC 12345",
      socialLinks: {
        instagram: "https://instagram.com/neverbeforemarketing",
        linkedin: "https://linkedin.com/company/neverbeforemarketing",
        youtube: "https://youtube.com/@neverbeforemarketing",
        twitter: "https://twitter.com/nbmarketing",
      },
    },
    isPublic: true,
    description: "Contact information and social media links",
  },

  // Hero Section
  {
    key: "hero_section",
    category: "sections",
    value: {
      title: "Elevate Your Brand with Stunning Visuals",
      subtitle: "Professional motion graphics and animation services that bring your vision to life",
      ctaText: "View Our Work",
      ctaLink: "/projects",
      backgroundVideo: "/assets/hero-bg.mp4",
    },
    isPublic: true,
    description: "Hero section content on homepage",
  },

  // Motion Graphics Section
  {
    key: "motion_graphics_section",
    category: "sections",
    value: {
      title: "Motion Graphics",
      description: "Dynamic animations and visual effects that captivate your audience",
      showcaseCount: 6,
      tags: ["2D Animation", "Logo Animation", "Explainer Videos", "Social Media Content"],
    },
    isPublic: true,
    description: "Motion graphics section configuration",
  },

  // Animations Section
  {
    key: "animations_section",
    category: "sections",
    value: {
      title: "3D Animations",
      description: "Cutting-edge 3D animations and product visualizations",
      showcaseCount: 6,
      tags: ["3D Modeling", "Product Visualization", "Character Animation", "Architectural Visualization"],
    },
    isPublic: true,
    description: "3D animations section configuration",
  },

  // Clients Section
  {
    key: "clients_section",
    category: "sections",
    value: {
      title: "Trusted by Leading Brands",
      logos: [
        { name: "Client 1", logo: "/assets/clients/client1.svg" },
        { name: "Client 2", logo: "/assets/clients/client2.svg" },
        { name: "Client 3", logo: "/assets/clients/client3.svg" },
        { name: "Client 4", logo: "/assets/clients/client4.svg" },
        { name: "Client 5", logo: "/assets/clients/client5.svg" },
        { name: "Client 6", logo: "/assets/clients/client6.svg" },
      ],
    },
    isPublic: true,
    description: "Client logos section",
  },

  // Software Section
  {
    key: "softwares_section",
    category: "sections",
    value: {
      title: "Industry-Leading Tools",
      items: [
        { name: "Adobe After Effects", icon: "/assets/software/after-effects.svg" },
        { name: "Cinema 4D", icon: "/assets/software/cinema4d.svg" },
        { name: "Blender", icon: "/assets/software/blender.svg" },
        { name: "Adobe Premiere Pro", icon: "/assets/software/premiere.svg" },
        { name: "DaVinci Resolve", icon: "/assets/software/davinci.svg" },
        { name: "Houdini", icon: "/assets/software/houdini.svg" },
      ],
    },
    isPublic: true,
    description: "Software/tools used section",
  },

  // Strategy Section
  {
    key: "strategy_section",
    category: "sections",
    value: {
      title: "Our Strategy",
      content: {
        introduction: "We follow a proven process to deliver exceptional results",
        steps: [
          {
            title: "Discovery",
            description: "Understanding your brand, goals, and target audience",
            icon: "🔍",
          },
          {
            title: "Concept",
            description: "Developing creative concepts that align with your vision",
            icon: "💡",
          },
          {
            title: "Production",
            description: "Bringing ideas to life with cutting-edge techniques",
            icon: "🎬",
          },
          {
            title: "Delivery",
            description: "Final polish and delivery in your preferred format",
            icon: "✨",
          },
        ],
      },
    },
    isPublic: true,
    description: "Strategy/process section content",
  },

  // Mission Section
  {
    key: "mission_section",
    category: "sections",
    value: {
      title: "Our Mission",
      content: "At Never Before Marketing, we're passionate about creating visual experiences that leave lasting impressions. Our team of talented artists and animators combines creativity with technical expertise to deliver motion graphics and animations that elevate your brand and engage your audience.",
      image: "/assets/mission-image.jpg",
    },
    isPublic: true,
    description: "Mission/about section content",
  },

  // Showcase Configuration
  {
    key: "showcase_config",
    category: "showcase",
    value: {
      homepageCardCount: 8,
      motionGraphicsCount: 12,
      animationsCount: 12,
      autoplay: true,
      showTags: true,
    },
    isPublic: true,
    description: "Showcase display configuration (card counts, features)",
  },

  // Email Settings (Private)
  {
    key: "email_settings",
    category: "email",
    value: {
      smtp_host: "smtp.gmail.com",
      smtp_port: 587,
      from_email: "hello@neverbeforemarketing.com",
      from_name: "Never Before Marketing",
    },
    isPublic: false,
    description: "Email configuration (private)",
  },

  // Feature Flags
  {
    key: "feature_flags",
    category: "features",
    value: {
      enableContactForm: true,
      enableNewsletter: true,
      enableBlog: false,
      enableTestimonials: false,
      maintenanceMode: false,
    },
    isPublic: true,
    description: "Feature toggle flags",
  },
];

async function seedSiteSettings() {
  console.log("[SEED] Seeding site settings...");
  console.log(`[INFO] Processing ${defaultSettings.length} settings...\n`);

  let created = 0;
  let skipped = 0;

  for (const setting of defaultSettings) {
    // Check if setting already exists
    const existing = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, setting.key))
      .limit(1);

    if (existing.length > 0) {
      console.log(`[SKIP] Setting already exists: ${setting.key}`);
      skipped++;
      continue;
    }

    // Create new setting
    await db.insert(siteSettings).values(setting);
    console.log(`[OK] Created: ${setting.key} (${setting.category})`);
    created++;
  }

  console.log(`\n[SUMMARY]`);
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total:   ${defaultSettings.length}`);
}

// Run seed
if (import.meta.main) {
  try {
    await seedSiteSettings();
    console.log("\n[SUCCESS] Site settings seeding completed successfully");
    await db.$client.end();
    Deno.exit(0);
  } catch (error) {
    console.error("\n[ERROR] Seeding failed:", error);
    Deno.exit(1);
  }
}
