import dotenv from "dotenv";
import path from "node:path";

dotenv.config({
  path: path.resolve(process.cwd(), ".env.local"),
});

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../src/lib/mongodb";
import User from "../src/models/User";
import Category from "../src/models/Category";
import Ticket from "../src/models/Ticket";

async function seedDatabase() {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");

    // 1. Create demo accounts.
    const demoUsers = [
      {
        name: "Campus Admin",
        email: "admin@campushelpdesk.com",
        password: "Admin@12345",
        role: "admin" as const,
      },
      {
        name: "Support Agent One",
        email: "agent1@campushelpdesk.com",
        password: "Agent@12345",
        role: "agent" as const,
      },
      {
        name: "Support Agent Two",
        email: "agent2@campushelpdesk.com",
        password: "Agent@12345",
        role: "agent" as const,
      },
      {
        name: "Student One",
        email: "student1@campushelpdesk.com",
        password: "Student@12345",
        role: "user" as const,
      },
      {
        name: "Student Two",
        email: "student2@campushelpdesk.com",
        password: "Student@12345",
        role: "user" as const,
      },
      {
        name: "Faculty Member",
        email: "faculty@campushelpdesk.com",
        password: "Faculty@12345",
        role: "user" as const,
      },
    ];

    const accounts = [];

    for (const demoUser of demoUsers) {
      const passwordHash = await bcrypt.hash(demoUser.password, 12);

      const account = await User.findOneAndUpdate(
        { email: demoUser.email },
        {
          $set: {
            name: demoUser.name,
            passwordHash,
            role: demoUser.role,
            active: true,
          },
          $setOnInsert: { email: demoUser.email },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

      accounts.push(account);
      console.log(`Account ready: ${demoUser.email}`);
    }

    const admin = accounts[0];
    const agents = accounts.slice(1, 3);
    const students = accounts.slice(3);

    // 2. Create four support categories.
    const categoryData = [
      {
        name: "IT Support",
        description: "Wi-Fi, computer labs, software, and student accounts.",
        defaultPriority: "Medium" as const,
      },
      {
        name: "Admissions",
        description: "Admission applications and enrollment questions.",
        defaultPriority: "Medium" as const,
      },
      {
        name: "Finance",
        description: "Tuition fees, scholarships, and payment issues.",
        defaultPriority: "High" as const,
      },
      {
        name: "Facilities",
        description: "Classrooms, electricity, furniture, and campus maintenance.",
        defaultPriority: "Low" as const,
      },
    ];

    const categories = [];

    for (const category of categoryData) {
      const savedCategory = await Category.findOneAndUpdate(
        { name: category.name },
        { $set: category },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

      categories.push(savedCategory);
    }

    console.log("Four support categories are ready.");

    // 3. Create 15 sample tickets only when the collection is empty.
    const existingTickets = await Ticket.countDocuments();

    if (existingTickets > 0) {
      console.log(
        `Found ${existingTickets} existing tickets. Skipping ticket seeding to protect existing records.`
      );
    } else {
      const priorities = [
        "Urgent",
        "High",
        "Medium",
        "Low",
        "Medium",
      ] as const;

      const statuses = [
        "Open",
        "In Progress",
        "Waiting on User",
        "Resolved",
        "Closed",
      ] as const;

      const ticketExamples = [
        ["Unable to access campus Wi-Fi", "I cannot connect to the campus Wi-Fi network."],
        ["Admission portal not loading", "The admission portal is not opening on my computer."],
        ["Tuition payment not updated", "My tuition payment was completed but is not showing."],
        ["Broken classroom projector", "The projector in our classroom is not working."],
        ["Student account password issue", "I need help accessing my student account."],
        ["Scholarship application question", "I need clarification about my scholarship application."],
        ["Computer lab software problem", "Required software is not opening in the computer lab."],
        ["Incorrect fee balance", "My student portal displays an incorrect fee balance."],
        ["Damaged classroom chair", "A chair in our classroom needs repair."],
        ["Cannot download class timetable", "The timetable download option is not working."],
        ["Email account access problem", "I cannot sign in to my college email account."],
        ["Admission document clarification", "I need help understanding the required documents."],
        ["Internet connection in library", "The library internet connection keeps disconnecting."],
        ["Request for classroom maintenance", "Our classroom needs maintenance."],
        ["Student portal loading slowly", "The student portal is taking too long to load."],
      ];

      for (let i = 0; i < ticketExamples.length; i++) {
        const [title, description] = ticketExamples[i];
        const priority = priorities[i % priorities.length];
        const status = statuses[i % statuses.length];
        const now = new Date();

        const hoursToRespond =
          priority === "Urgent" ? 1 :
          priority === "High" ? 4 :
          priority === "Medium" ? 8 : 24;

        const hoursToResolve =
          priority === "Urgent" ? 8 :
          priority === "High" ? 24 :
          priority === "Medium" ? 48 : 72;

        const ticket = new Ticket({
          title,
          description,
          category: categories[i % categories.length]._id,
          priority,
          status,
          createdBy: students[i % students.length]._id,
          assignedAgent: i % 4 === 0 ? null : agents[i % agents.length]._id,
          attachments: [],
          firstResponseDueAt: new Date(
            now.getTime() + hoursToRespond * 60 * 60 * 1000
          ),
          resolutionDueAt: new Date(
            now.getTime() + hoursToResolve * 60 * 60 * 1000
          ),
          firstResponseBreached: false,
          resolutionBreached: false,
          ...(status === "Resolved" || status === "Closed"
            ? { resolvedAt: now }
            : {}),
          ...(status === "Resolved"
            ? { autoCloseAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) }
            : {}),
        });

        // save() runs the ticket-number validation hook.
        await ticket.save();
      }

      console.log("Created 15 sample tickets.");
    }

    console.log("\nDatabase seeding completed successfully.");
    console.log(`Admin: ${admin.email}`);
    console.log(`Agents: ${agents.map((agent) => agent.email).join(", ")}`);
    console.log(`Users: ${students.map((student) => student.email).join(", ")}`);
  } catch (error) {
    console.error("Database seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedDatabase();
