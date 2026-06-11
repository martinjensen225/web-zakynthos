# Specification Document: Collaborative Mobile-First Trip Planning Web App

## 1. Product Concept

## Working name

**TandemTrip**

## One-line description

TandemTrip is a collaborative, mobile-first trip planning web app for couples and small groups that turns ideas, bookings, budgets, decisions, documents, and daily plans into one clear shared travel cockpit.

## Product vision

The app should feel like a calm command center for a shared trip. It should make travel planning less scattered, less stressful, and more exciting.

The key product idea is:

**A trip is not just an itinerary. It is a shared decision system, a travel wallet, a map, a budget, a memory board, and a day-of assistant.**

The product should help two people answer:

* What are we doing?
* What have we agreed on?
* What is still undecided?
* What is booked?
* What does it cost?
* What do we need today?
* What could go wrong?
* What will make this trip feel special?

---

# 2. Product Positioning

## Main target user

A couple planning a leisure trip together.

They may use messages, screenshots, Google Maps saves, booking emails, notes, spreadsheets, and calendar events today. TandemTrip should replace that scattered workflow with one shared place.

## Secondary users

* Friend groups
* Families
* Multi-city travellers
* Road trip planners
* Travel partners with different planning styles
* People who want to plan together without using spreadsheets

## Core differentiation

Most trip apps are strong in one area:

* Itinerary organization
* Map planning
* Booking storage
* AI trip generation
* Budget tracking
* Group collaboration

TandemTrip should combine these into a couple-friendly planning experience centered around **shared decisions, emotional trip goals, readiness, and day-of clarity**.

The product should feel less like project management and more like building a trip together.

---

# 3. Product Principles

## 3.1 Mobile-first, desktop-enhanced

The mobile version is the primary experience. Desktop should provide larger planning surfaces, split views, and easier drag-and-drop, but every important action must work well on a phone.

## 3.2 Overview first

Users should always be able to understand the trip in under 10 seconds.

The first screen should show:

* Next important thing
* Current planning status
* Open decisions
* Booked essentials
* Today’s plan during the trip
* Budget status
* Important warnings

## 3.3 Editing should feel like editing cards

The app should avoid complex forms where possible. Most information should be edited through simple cards with friendly fields.

A user should be able to add a useful item with only:

* Title
* Day or destination
* Optional time
* Optional location

Everything else can be completed later.

## 3.4 Collaboration should be visible

Users should understand:

* Who added something
* Who changed something
* What is confirmed
* What needs approval
* What both people like
* Where there is disagreement

## 3.5 AI should be explainable and editable

AI can suggest, organize, summarize, warn, and compare. Users should always stay in control.

The app should avoid “magic itinerary” behavior where plans appear without clear reasoning.

## 3.6 Designed for before, during, and after the trip

The product has three modes:

1. **Planning Mode** before the trip
2. **Travel Mode** during the trip
3. **Memory Mode** after the trip

---

# 4. Key Product Idea: The Trip Cockpit

The main innovation should be the **Trip Cockpit**.

This is the home screen for the trip and the emotional center of the app.

## Trip Cockpit should include

### 1. Hero trip card

Shows:

* Trip name
* Destination image
* Dates
* Countdown
* Travellers
* Trip mood
* Readiness score

Example:

**Rome Together**
12–17 July
5 days away
Mood: Romantic, food-focused, relaxed
Readiness: 82%

### 2. Next action

Before the trip:

* “Decide Saturday dinner”
* “Upload hotel booking”
* “Choose between 3 saved activities”
* “Add airport transfer”

During the trip:

* “Next: Train to Florence at 10:35”
* “Leave hotel around 09:45”
* “Ticket needed: Platform QR code”

### 3. Today / Next day preview

A compact timeline with only the most important upcoming items.

### 4. Open decisions

A visible list of unresolved choices.

Example:

* Saturday dinner: 3 options
* Museum day: yes/no
* Airport transfer: train or taxi
* Hotel upgrade: decide by Friday

### 5. Trip readiness

A planning-health panel.

Example categories:

* Dates set
* Accommodation added
* Transport added
* Documents uploaded
* Daily plan balanced
* Budget estimated
* Packing started
* Emergency info added

### 6. Alerts

Only show alerts that matter.

Examples:

* “Hotel check-in time missing”
* “Two activities overlap”
* “You have no accommodation for night 3”
* “This day looks overloaded”
* “Restaurant may be far from the evening plan”

---

# 5. Main Navigation

## Mobile navigation

Use a persistent bottom navigation bar with five sections:

1. **Cockpit**
2. **Plan**
3. **Map**
4. **Decide**
5. **More**

A central floating **Add** button should be available on Cockpit, Plan, Map, and Decide.

## Desktop navigation

Use a left sidebar:

* Cockpit
* Plan
* Map
* Ideas
* Decisions
* Budget
* Documents
* Packing
* Tasks
* Memories
* Settings

Desktop should support split views:

* Plan + map
* Ideas + map
* Budget + itinerary
* Documents + linked trip items
* Decisions + comparison view

---

# 6. Information Architecture

## Core sections

## 6.1 Cockpit

The main overview and trip status page.

## 6.2 Plan

Day-by-day itinerary.

## 6.3 Map

All places, routes, clusters, and distances.

## 6.4 Decide

Shared decisions, voting, comparisons, polls, and unresolved choices.

## 6.5 More

Secondary tools:

* Ideas
* Budget
* Documents
* Packing
* Tasks
* Memories
* Settings

On desktop, these can become full sidebar sections.

---

# 7. Core Screens

# 7.1 Cockpit Screen

## Purpose

Give users the best possible overview of the trip.

## Mobile layout

### Top

* Trip name
* Destination
* Dates
* Member avatars
* Small settings button

### Hero card

* Cover image
* Countdown or current travel day
* Trip mood
* Readiness score

### Priority card

One main recommended action.

Examples:

* “Decide Saturday dinner”
* “Add your hotel booking”
* “Today: leave for airport by 14:10”
* “Your plan has a timing conflict”

### Timeline preview

Shows today or the next planned day.

### Open items

* Decisions
* Tasks
* Missing details
* Documents needed

### Quick actions

* Add plan item
* Add idea
* Add expense
* Upload document

---

# 7.2 Plan Screen

## Purpose

Create and edit the trip itinerary.

## Primary mobile view

A vertical day-by-day timeline.

Each day has:

* Date
* Destination
* Weather preview
* Day mood
* Balance indicator
* Timeline cards

## Day sections

Each day can be divided into:

* Morning
* Afternoon
* Evening
* Flexible / unscheduled

This is easier for casual users than requiring exact times for everything.

## Card types

* Flight
* Train
* Bus
* Car
* Ferry
* Accommodation
* Activity
* Restaurant
* Reservation
* Free time
* Note
* Reminder
* Custom item

## Item card summary

Each card should show:

* Icon
* Title
* Time or day section
* Location
* Status
* Cost estimate
* Comments
* Attachment indicator
* Warning indicator if needed

## Status chips

* Idea
* Suggested
* Planned
* Booked
* Confirmed
* Needs decision
* Needs details
* Cancelled
* Private

## Day Balance Indicator

Each day should have a planning-density state:

* **Relaxed**: plenty of free time
* **Balanced**: good mix of plan and flexibility
* **Busy**: many items or travel-heavy
* **Overloaded**: likely unrealistic

The app should explain the reason.

Example:

“This day has 5 activities, 2 reservations, and 80 minutes of travel between places.”

## Editing itinerary items

Tap a card to open a bottom sheet on mobile.

The bottom sheet shows:

* Title
* Date
* Time
* Location
* Status
* Notes
* Linked documents
* Cost
* Comments
* History
* Visibility

Simple editing should happen inline.

---

# 7.3 Map Screen

## Purpose

Help users understand where everything is.

## Map layers

* Planned items
* Ideas
* Accommodation
* Food
* Transport
* Documents linked to places
* Today only
* By day
* By status

## Mobile map behavior

The map should have a bottom drawer.

Drawer states:

1. Collapsed: shows selected pin or next item
2. Half-open: shows nearby trip places
3. Full-screen: shows list of map items

## Map insights

The app should detect:

* Activities that are far apart
* Bad sequencing
* Long walks
* Hotel far from most plans
* Airport/station transfer gaps
* Nearby saved ideas that fit free time

## Great feature: “What’s nearby now?”

During the trip, the user can tap:

**Nearby from our plan**

The app shows:

* Saved ideas nearby
* Food options near next activity
* Emergency pharmacy or grocery
* Backup rainy-day ideas
* Coffee or rest stops

---

# 7.4 Decide Screen

## Purpose

Turn shared uncertainty into clear decisions.

This should be one of the strongest differentiators.

## Decision types

* Choose one option
* Yes/no
* Rank options
* Pick a date/time
* Budget approval
* Surprise/private decision
* Open discussion

## Decision card example

**Saturday dinner**

Options:

1. Rooftop restaurant
2. Local trattoria
3. Food market

Each person can mark:

* Love
* Like
* Fine
* Skip

The app then shows:

**Best match: Local trattoria**
Reason: both people marked it “Love” or “Like,” it is close to the evening walk, and it fits the budget.

## Decision states

* Needs vote
* Waiting for partner
* Tie
* Recommended match
* Decided
* Archived

## Couple-specific decision features

### “Both of us love”

A special filter showing options both people are excited about.

### “Good compromise”

Shows options that may not be either person’s top choice, but work well for both.

### “Save for future trip”

Lets users keep rejected ideas without losing them.

### “Surprise decision”

One person can decide privately while still blocking the time in the itinerary.

---

# 7.5 Ideas Board

## Purpose

Collect inspiration before turning it into the plan.

## Sources

Users should be able to add ideas from:

* Manual entry
* Map search
* Link
* Screenshot
* Shared note
* AI suggestion
* Past trip
* Partner suggestion

## Idea card fields

* Title
* Image
* Category
* Location
* Price range
* Time needed
* Opening hours if available
* Source
* Added by
* Votes
* Notes
* Status

## Idea statuses

* New
* Interested
* Shortlisted
* Deciding
* Added to plan
* Skipped
* Saved for later

## Views

* Board view
* List view
* Map view
* “Both liked” view
* “Near hotel” view
* “Fits free time” view

## Great feature: Inspiration Inbox

A place where rough ideas can land before being organized.

Examples:

* A pasted link
* A screenshot
* A restaurant name
* A note like “cute canal walk”
* A voice note from one partner

The app later helps convert these into structured trip items.

---

# 7.6 Budget Screen

## Purpose

Make trip money clear without a spreadsheet.

## Budget overview

Show:

* Estimated total
* Confirmed total
* Paid total
* Remaining expected cost
* Cost per person
* Shared vs individual costs
* Daily average
* Category breakdown

## Budget states

* Under target
* On track
* Slightly above
* Needs review
* Missing estimates

## Expense types

* Estimate
* Confirmed cost
* Paid expense
* Reimbursement
* Private expense
* Gift/surprise

## Expense card fields

* Title
* Amount
* Currency
* Category
* Paid by
* Split between
* Linked itinerary item
* Receipt
* Notes

## Couple-friendly feature: Comfort Budget

Each user can privately choose a spending comfort level:

* Budget-conscious
* Comfortable
* Treat ourselves
* Flexible

The app should use this to flag choices gently.

Example:

“This hotel is above the comfort range you both selected.”

## Great feature: Budget impact preview

When deciding between options, show the impact.

Example:

**Rooftop restaurant**

* Adds approx. €120
* Makes Saturday the most expensive day
* Still within total trip target

---

# 7.7 Documents and Travel Wallet

## Purpose

Keep essential travel information instantly available.

## Document types

* Flight confirmation
* Boarding pass
* Hotel booking
* Train ticket
* Event ticket
* Restaurant reservation
* Passport copy
* Insurance
* Visa
* Rental agreement
* Emergency contact
* Medical note
* Custom document

## Document features

* Upload PDF
* Upload image
* Add manual confirmation number
* Add QR/barcode image
* Link document to itinerary item
* Mark as important
* Make private
* Make available offline
* Add expiry date
* Add reminder

## Travel Wallet

A special mobile-first screen for travel days.

Shows:

* Today’s tickets
* Tonight’s accommodation
* Booking references
* Passport/insurance notes
* Emergency contacts
* Offline map shortcut
* Important phone numbers
* Local address card

The Travel Wallet should be accessible from the Cockpit with one tap.

## Great feature: Lock Screen Cards

The app can generate compact cards users can screenshot or save:

* Hotel address
* Airport transfer
* Booking reference
* Emergency info
* “Today’s plan”

---

# 7.8 Packing Screen

## Purpose

Make packing shared and personal.

## Packing list types

* Shared items
* Person A
* Person B
* Documents
* Clothing
* Toiletries
* Electronics
* Medicine
* Weather-specific
* Activity-specific
* Last-minute

## Features

* Assign item
* Mark as packed
* Add quantity
* Mark as essential
* Reuse from previous trip
* Add template
* Add custom category

## Smart suggestions

The app can suggest packing items based on:

* Trip length
* Weather
* Activities
* Accommodation
* Transport
* Destination type

Example:

“You added a hike and a beach day. Consider hiking shoes, swimwear, sunscreen, and a reusable bottle.”

---

# 7.9 Tasks Screen

## Purpose

Keep planning responsibilities clear.

## Task examples

* Book hotel
* Check passport
* Reserve dinner
* Buy train tickets
* Upload insurance
* Pack chargers
* Download offline maps
* Confirm airport transfer

## Task fields

* Title
* Assignee
* Due date
* Priority
* Related trip item
* Status
* Notes

## Task statuses

* To do
* In progress
* Waiting
* Done

## Great feature: Countdown checklist

Tasks are grouped by timing:

* Anytime
* 1 month before
* 2 weeks before
* 1 week before
* 1 day before
* Day of travel

---

# 7.10 Memories Screen

## Purpose

Give the app value after the trip.

## Memory features

* Add photos to days
* Mark favorite moments
* Save places worth revisiting
* Record actual expenses
* Write short notes
* Create a trip recap
* Duplicate trip structure for future travel

## Great feature: “What we learned”

After the trip, the app asks:

* What did we love?
* What was too much?
* What would we skip next time?
* What budget estimate was wrong?
* What should we pack next time?

This improves future planning.

---

# 8. Editing Experience

## 8.1 Universal Add Button

The Add button should be visible and consistent.

Options:

* Plan item
* Idea
* Decision
* Expense
* Document
* Task
* Note

## 8.2 Add flow

The app should ask:

1. What are you adding?
2. What is the minimum required?
3. Where should it go?
4. Save immediately
5. Add details later

## 8.3 Simple and advanced editing

### Simple edit mode

Default for all users.

Shows:

* Title
* Date
* Time or day section
* Location
* Notes
* Status

### Advanced edit mode

Available behind “More details.”

Shows:

* Cost
* Visibility
* Attachments
* Linked tasks
* Reminders
* Custom fields
* Change history
* Approval rules

## 8.4 Inline editing

Users should be able to tap text fields directly.

Example:

Tap “18:30” to change the time.

Tap “Needs details” to change status.

Tap “Add location” to search or type a place.

## 8.5 Forgiving forms

The app should never punish incomplete input.

Users can save:

* A restaurant without a time
* A hotel without confirmation number
* A flight without terminal
* An idea without location
* An expense without category

Missing details should become helpful prompts.

## 8.6 Undo and recovery

Every significant edit should support:

* Undo
* Version history
* Restore previous value
* “Changed by” label
* Conflict comparison

## 8.7 Mobile movement

Since drag-and-drop can be difficult on mobile, every draggable action must have a tap alternative:

* Move to another day
* Move earlier
* Move later
* Add to free time
* Duplicate
* Convert to idea
* Archive

---

# 9. Collaboration and Authorization

## 9.1 Roles

### Owner

Can:

* Manage trip
* Delete trip
* Invite/remove people
* Change permissions
* Edit all content
* View history
* Export data

### Editor

Can:

* Add and edit plan items
* Upload documents
* Add expenses
* Add ideas
* Vote
* Comment
* Complete tasks

### Contributor

Can:

* Add ideas
* Comment
* Vote
* Suggest changes
* Add assigned expenses
* Complete assigned tasks

Confirmed itinerary changes may require approval.

### Viewer

Can:

* View selected trip content
* Open documents if allowed
* See itinerary
* See map

### Limited guest

Can see only selected days, sections, or items.

Useful for:

* A friend joining one day
* Family checking arrival details
* Someone receiving accommodation info
* A surprise participant

---

## 9.2 Item-level privacy

Each item can be visible to:

* Everyone
* Owners only
* Specific people
* Hidden until date/time
* Private to creator

This supports:

* Surprise dates
* Gifts
* Sensitive documents
* Personal expenses
* Medical notes

---

## 9.3 Approval flow

Important edits can require approval.

Examples:

* Change accommodation
* Delete confirmed booking
* Move major transport item
* Add large shared expense
* Edit travel dates

Approval actions:

* Approve
* Reject
* Discuss
* Compare
* Suggest alternative

---

# 10. AI Assistance

AI should be useful, careful, and transparent.

## AI roles

### 1. Organize

Turn rough notes into structured ideas.

Example:

User pastes:
“Cute pasta place, canal walk, museum Emma mentioned”

AI suggests:

* Restaurant idea
* Activity idea
* Possible decision

### 2. Summarize

Summarize open questions.

Example:

“You have 4 unresolved dinner ideas. Two are close to your hotel and one is above budget.”

### 3. Detect issues

Find plan problems:

* Overlaps
* Too much travel time
* Missing accommodation
* Missing documents
* Budget surprises
* Overloaded days

### 4. Suggest

Recommend additions based on user preferences.

Examples:

* “You have a free morning near the old town.”
* “This rainy day may suit indoor activities.”
* “Both of you liked food experiences. Consider moving the cooking class to Friday.”

### 5. Compare

Compare options in a decision card.

Example:

* Cost
* Distance
* Time needed
* Mood fit
* Weather fit
* Partner votes

## AI rules

* Every suggestion must be editable.
* AI should explain why it suggests something.
* AI should show uncertainty when details are missing.
* AI should separate confirmed facts from assumptions.
* AI should encourage verification before booking.
* AI should never silently change confirmed plans.

## Great AI feature: Plan Coach

A lightweight assistant that appears only when useful.

Examples:

* “This day looks intense. Want me to suggest a calmer version?”
* “You have three dinner ideas. Want a comparison?”
* “Your hotel booking mentions check-in after 15:00. Want me to add it?”
* “You have a 2-hour gap near the museum. Want nearby ideas?”

---

# 11. Unique Feature Set

## 11.1 Trip Mood

At setup, users choose the desired feel:

* Romantic
* Relaxed
* Adventurous
* Food-focused
* Cultural
* Luxury
* Budget-friendly
* Spontaneous
* Nature-focused
* Nightlife
* Wellness
* Slow travel

Each person can choose separately.

The app shows overlap:

**Shared mood:** Romantic, relaxed, food-focused
**Different preferences:** Martin wants adventure, Emma wants slow mornings

This can guide suggestions and day balance.

---

## 11.2 Preference Match

Each idea can show how well it matches both people.

Example:

**Wine tasting**

* Martin: high match
* Emma: medium match
* Couple match: good

The app should avoid turning travel into a score-heavy experience. Keep this subtle and friendly.

---

## 11.3 Shared Uncertainty Inbox

A place for unresolved thoughts.

Examples:

* “Should we rent a car?”
* “Is this hotel too far away?”
* “Do we need museum tickets?”
* “Are we doing too much?”

These can become:

* Decisions
* Tasks
* Notes
* AI comparisons

---

## 11.4 Surprise Mode

One user can add a hidden item.

Example:

**Private plan by Martin**
Saturday, 19:00–22:00
Details hidden until 2 hours before

Visibility options:

* Hide title and details
* Show title only
* Show time block only
* Reveal at chosen time

---

## 11.5 Trip Readiness Score

A clear but friendly planning progress system.

Categories:

* Transport
* Accommodation
* Documents
* Budget
* Daily plan
* Packing
* Tasks
* Emergency info

Readiness should avoid making users anxious.

Use wording like:

* “Looking good”
* “A few things left”
* “Needs attention”
* “Ready to travel”

---

## 11.6 Reality Check

Before the trip, users can run:

**Check our plan**

The app reviews:

* Timing
* Distance
* Missing bookings
* Budget
* Packing
* Documents
* Open decisions
* Weather mismatch
* Overloaded days

Output:

* Looks good
* Needs review
* Important issue

---

## 11.7 Travel Mode

Automatically activates during the trip.

Shows:

* Today’s timeline
* Next item
* Directions
* Leave-by time
* Tickets and documents
* Quick expense
* Quick note
* Nearby saved ideas
* Emergency info

Travel Mode should reduce clutter. Planning tools are still available, but the main screen becomes action-oriented.

---

## 11.8 Backup Plans

Users can save backup options.

Examples:

* Rainy-day backup
* Late arrival backup
* Cheaper restaurant backup
* Low-energy day backup
* Bad weather route
* Fully spontaneous day

During the trip, the app can suggest backups when plans change.

---

## 11.9 “Good Day” Builder

Instead of only adding activities, users can design the rhythm of a day.

Options:

* Slow morning
* Big lunch
* One main activity
* Sunset moment
* Romantic dinner
* Early night
* Explore freely
* Shopping block
* Wellness block

This helps non-technical users plan by feeling and pacing.

---

## 11.10 Memory Loop

After the trip, the app turns the plan into reusable insight.

Examples:

* “You preferred 2–3 planned items per day.”
* “Food activities were your highest-rated moments.”
* “You spent 18% more on restaurants than expected.”
* “You skipped two early morning plans.”
* “You liked hotels near walkable areas.”

---

# 12. User Flows

## 12.1 Create trip

1. Tap “Create trip”
2. Add destination
3. Add dates
4. Choose travel style
5. Invite partner
6. Land in Cockpit

The app creates:

* Day structure
* Empty ideas board
* Empty budget
* Starter checklist
* Packing template
* Decision area

---

## 12.2 Invite partner

1. Tap Invite
2. Choose role
3. Share link
4. Partner joins
5. Partner chooses preferences
6. App shows shared and different travel moods

---

## 12.3 Add rough idea

1. Tap Add
2. Choose Idea
3. Type, paste, or upload
4. Save to Inspiration Inbox
5. Add details later

---

## 12.4 Decide between options

1. Open Decide
2. Create decision
3. Add options
4. Both users vote
5. App shows match
6. Users confirm
7. Winning option can become itinerary item

---

## 12.5 Add confirmed booking

1. Tap Add
2. Choose Document or Booking
3. Upload file or enter details
4. Link to flight/hotel/activity
5. Mark confirmed
6. Item appears in Plan, Documents, and Cockpit

---

## 12.6 Use during travel

1. Open app
2. Travel Mode shows next item
3. Tap directions or document
4. Add quick expense
5. Add note/photo
6. Switch to map if needed

---

# 13. Visual Design Direction

## Overall feel

* Calm
* Warm
* Romantic
* Clean
* Trustworthy
* Light
* Visual
* Friendly

## UI style

* Rounded cards
* Clear spacing
* Large touch targets
* Soft dividers
* Destination imagery
* Gentle icons
* Status chips
* Bottom sheets on mobile
* Split panes on desktop

## Visual hierarchy

The UI should prioritize:

1. What is next
2. What needs attention
3. What is confirmed
4. What is undecided
5. What can be explored

## Color system

Suggested color roles:

* Primary: main action
* Soft accent: mood and highlights
* Green: confirmed
* Yellow/orange: needs attention
* Red: serious issue
* Blue: travel/transport
* Purple: private/surprise
* Gray: draft or undecided

## Typography

Use highly readable text.

Mobile priorities:

* Large page titles
* Clear card titles
* Short labels
* Minimal dense text
* Expandable details

---

# 14. Accessibility Requirements

The app should meet strong accessibility expectations.

Requirements:

* Sufficient color contrast
* Minimum accessible touch target sizing
* Clear focus states
* Keyboard navigation
* Screen reader labels
* Text alternatives for icons
* No meaning conveyed by color alone
* Reduced motion support
* Clear form labels
* Helpful validation
* Responsive layout down to small mobile screens

Error messages should explain the fix.

Example:

Use:
“Add a date before setting a reminder.”

Avoid vague messages like:
“Invalid input.”

---

# 15. Notifications

## Notification types

* Partner added idea
* Partner voted
* Partner commented
* Partner changed confirmed item
* Decision needs response
* Task due soon
* Booking missing details
* Travel document needed
* Leave soon
* Budget changed
* Day overloaded

## Notification preferences

Users can choose:

* Everything
* Important only
* Decisions and tasks only
* Travel-day reminders only
* Muted

## Daily digest

Before the trip, send one optional daily summary:

* New ideas
* Open decisions
* Upcoming tasks
* Readiness changes

---

# 16. Search

Global search should find:

* Plan items
* Places
* Ideas
* Documents
* Notes
* Expenses
* Decisions
* Comments
* Tasks

Search results should be grouped by type.

Example:

Search: “hotel”

Results:

* Hotel booking
* Hotel receipt
* Task: confirm check-in
* Comment mentioning hotel
* Map pin

---

# 17. Data Objects

## Trip

* Name
* Destination
* Dates
* Members
* Cover image
* Mood
* Budget target
* Permissions
* Settings

## Traveller

* Name
* Role
* Preferences
* Notification settings
* Visibility permissions

## Day

* Date
* Destination
* Weather
* Mood
* Balance status
* Itinerary items
* Notes

## Itinerary item

* Title
* Type
* Date
* Time
* Location
* Status
* Cost
* Notes
* Linked documents
* Linked tasks
* Comments
* Visibility
* History

## Idea

* Title
* Category
* Source
* Location
* Image
* Notes
* Votes
* Status
* Linked decision
* Linked itinerary item

## Decision

* Title
* Type
* Options
* Votes
* Comments
* Status
* Final choice
* Linked item

## Expense

* Title
* Amount
* Currency
* Category
* Paid by
* Split between
* Status
* Receipt
* Linked item

## Document

* Title
* Type
* File
* Linked item
* Visibility
* Important flag
* Offline flag
* Expiry date

## Task

* Title
* Assignee
* Due date
* Priority
* Status
* Linked item

---

# 18. MVP Scope

## Must have

* Create trip
* Invite partner
* Mobile-first Cockpit
* Day-by-day itinerary
* Add/edit plan items
* Ideas board
* Basic decisions and voting
* Basic comments
* Basic documents
* Basic budget
* Basic packing list
* Basic tasks
* Roles: Owner, Editor, Viewer
* Mobile bottom navigation
* Responsive desktop layout
* Change history for important edits

## Should have

* Map pins
* Travel Wallet
* Trip Readiness Score
* Day Balance Indicator
* Approval flow
* Offline travel pack
* Surprise Mode
* Budget split
* Export itinerary
* AI Plan Coach

## Later

* Booking email import
* Calendar sync
* Live flight/train alerts
* Advanced AI comparisons
* Receipt scanning
* Social media inspiration import
* Past trip memory
* Public trip templates
* Multi-city optimization
* Local recommendations
* Real-time disruption handling

---

# 19. MVP User Experience Goals

The MVP is successful if:

* A user can create a trip in under 2 minutes.
* A partner can join without explanation.
* A plan item can be added in under 20 seconds.
* The Cockpit explains the trip status in under 10 seconds.
* A non-technical user can edit the itinerary confidently.
* Users can see what is confirmed and what is undecided.
* Users can find documents quickly on mobile.
* Users can make shared decisions without leaving the app.
* The app remains useful during the trip.

---

# 20. Suggested Mobile Screen Structure

## Cockpit

* Trip hero
* Next action
* Today/next day
* Open decisions
* Readiness
* Quick actions

## Plan

* Day tabs or scroll
* Timeline cards
* Add item
* Day balance
* Missing details

## Map

* Pins
* Filters
* Bottom drawer
* Nearby from plan
* Route insight

## Decide

* Open decisions
* Votes
* Comparisons
* Final choices
* Convert to plan

## More

* Ideas
* Budget
* Documents
* Packing
* Tasks
* Memories
* Settings

---

# 21. Example Mobile Card Designs

## Itinerary card

**Dinner at Roscioli**
Saturday · 19:30
Booked · €€€
8 min walk from previous stop
2 comments · booking attached

Actions:

* Open
* Directions
* Document
* Comment
* Edit

## Decision card

**Choose Sunday activity**
Waiting for Emma

Options:

* Cooking class
* Vatican museum
* Slow morning + market

Current best match: Cooking class

Actions:

* Vote
* Compare
* Comment
* Decide

## Alert card

**Saturday may be overloaded**
You have 6 planned items and 2 reservations.

Actions:

* View issue
* Suggest calmer day
* Ignore

## Travel Wallet card

**Hotel Artemide**
Check-in after 15:00
Booking ref: 8342-KL
Address available offline

Actions:

* Directions
* Show booking
* Call hotel

---

# 22. Design Risks and Solutions

## Risk: Too many features

Solution:

Use Cockpit as the main simplifier. Keep secondary features under More.

## Risk: AI feels untrustworthy

Solution:

Require explanations, sources, and user confirmation. Keep AI suggestions separate from confirmed plans.

## Risk: Collaboration becomes noisy

Solution:

Use digest notifications and highlight only decisions, confirmed changes, and travel-day alerts.

## Risk: Editing feels complicated

Solution:

Use simple edit by default, advanced edit only when needed, and allow incomplete saves.

## Risk: Map overwhelms users

Solution:

Default to “planned items” and “today.” Let users add more layers when needed.

---

# 23. Final Product Summary

TandemTrip should be a collaborative travel cockpit for couples and small groups.

Its strongest design idea is to treat planning as a shared emotional and practical process:

* What do we both want?
* What have we decided?
* What still needs attention?
* What is realistic?
* What do we need today?
* What will make the trip memorable?

The app should combine itinerary, ideas, decisions, map, documents, budget, packing, and tasks into one mobile-first experience.

The app should feel warm and simple on the surface, with powerful organization underneath.

The best version of TandemTrip is one where both people want to open the app because it makes the trip clearer, calmer, and more exciting.
