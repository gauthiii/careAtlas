# **AI Governance Demo-20260620_100806-Meeting Recording** 

June 20, 2026, 5:08PM 1h 0m 23s 

**Gautham Vijayaraj** started transcription 

**Kuppusami Natesan** 0:04 

Oh, yes, good. 

**Gautham Vijayaraj** 0:04 Uh, yeah, okay. 

**Kuppusami Natesan** 0:06 

Super. 

**Gautham Vijayaraj** 0:07 Play everyone. 

**Sivashankar Balamuralikrishnan** 0:11 

Bro, how did you do that while you were typing? You have two devices, do you? Recording start? 

**Gautham Vijayaraj** 0:11 

I still like. Another, another one device. 

**Sivashankar Balamuralikrishnan** 0:16 

No. 

**Gautham Vijayaraj** 0:17 

Yeah, what happened? 

## **Sivashankar Balamuralikrishnan** 0:20 

Say, ohh no, I'll ask you later, go. 

**Gautham Vijayaraj** 0:22 

OK, one second. So, so this is the agenda for today's demo. So, like, for one minute, I'll just, we'll just cover what we've done till now. So, we have 3 portals, one for patient, clinician, and governance portal, and then we have a... 

## **Kuppusami Natesan** 0:30 

Mm. Mhm. Mm. 

**Gautham Vijayaraj** 0:42 

MFA authentication configured for all of the portals and we have configured the database using ServiceNow instances tables and. 

**Kuppusami Natesan** 0:46 

Mm. 

**Gautham Vijayaraj** 0:56 

This is the agent pipeline. It contains more agents, but the agent that matters is the scheduling appointment agent, the identity verification agent. We also call it the patient data agent. And there's something called the bad data agent, which I need to demonstrate the least privileged use case. And yeah, we have the fatness monitoring agent and the triage agent. Rest all are just agents just to populate the inventory data so that we can... 

you can show the AI shadow discovery. And then we use data to a protocol to communicate with the agents from the agent studio with our dashboards. And then for the ACL, we have 5 non-human identities configured with respective roles and permissions associated with them. 

**Kuppusami Natesan** 1:25 

Okay. Mhm. 

## **Gautham Vijayaraj** 1:43 

And then we'll show you a demonstration of how a good scheduling agent should respond and how a bad agent should respond. And then the shadow AI discovery, which will be managed in the AI control tower. And then. These are just some UI modifications just to add notifications corresponding to each appointment based on whether it's a patient or a clinician or a staff. And then... 

Yeah, so what, so after that, so this was there initially in our previous agenda, but on Wednesday we had a discussion that we'll try to show whatever we can from the LLM risks that we want to address in this. 

demo or whatever, yeah, demo, yeah. Okay, so, so I'm just gonna, I'm just gonna go start with the patient portal. 

## **Kuppusami Natesan** 2:36 

OK. 

## **Gautham Vijayaraj** 2:46 

So, so this is the homepage, so a patient can register through this page. I've added a generate button to just generate sample values for us. 

Just gonna add my name now. 

## **Kuppusami Natesan** 3:01 

You are registering a new patient. 

## **Gautham Vijayaraj** 3:02 

Very good. 

Yeah, and here, so a password is auto-generated. So, sir, now I assume that I'm adding a simple password like Admin at 123, and if I hit this check button, so I we found an API that that has access to. 

millions and millions of breached passwords. So if that password is found in that breach, it will send us an alert over here. So this is something that we 

added. Yeah, I mean, I would, yeah, this isn't a part of the AI governance, but generally in terms of security, yeah. 

**Kuppusami Natesan** 3:31 Hmm, interesting. Linux. 

Yeah. 

**Gautham Vijayaraj** 3:41 Yeah, yeah. But when Chahine with. The. Angad. Oh, okay, my bad. But it makes you. Oh, your surname? 

Sir, if it's noisy, just let me know, I'll just mute whenever I not talk, yeah, OK. So, so whenever we register, it will automatically prompt us to, you know, set up in case I forget to do this or I just refresh or something, I go directly to the screen. 

**Kuppusami Natesan** 4:08 Not yet, fine. Group. 

## **Gautham Vijayaraj** 4:20 

and I enter my account details, just like the top, it will prompt us to, you know, set up our. 

MFA again. 

Okay, so I'll anyway do this, but now if I do this, the data will be empty inside. So I'm going to go through a user that already exists. 

Just a second, sir. So, I'll receive, so this is basically a, so I mean, if you need me to, yeah, go through this, yeah, yeah, yeah, but we we replicated even the 

counter schemes from there, actually. I'm fine, yeah, I mean, the grid goes to Hema for this. 

## **Kuppusami Natesan** 4:57 

Yeah, no good. This is good. Very good. 

Love it. 

Of course, what else do you expect for her? 

## **Gautham Vijayaraj** 5:10 

Yes, yeah. 

Yeah. 

Yeah, so since I asked, since I used an agent to, you know, populate patient data, we have a name like this. This is, this was not my first choice. So anyway, this is the dashboard. We can see our upcoming appointments, if there are any, our appointment history, if there are any, and we can see any notifications related to any of our past appointments. I mean, since I didn't open them, it says 100. If I open them, it'll automatically, yeah. 

## **Kuppusami Natesan** 5:33 

Yeah. That's fine. It's OK. 

## **Gautham Vijayaraj** 5:40 

Yeah, and when I want to book appointments, I can choose the specialty. I mean, I can choose, I mean, the specialty that I term, okay, I'll just say specialty for note. So if I want to choose something, and if I want to choose a doc, yeah, general practice, I'll be able to see the doctors from that category alone. And if I want to see from oncology, I'll see doctors from that category alone. So for each specialty. 

## **Kuppusami Natesan** 5:51 

General's practice. 

**Gautham Vijayaraj** 6:02 

we have like a shift timing that is configured. So if there are already, okay, let me just choose Lucas Walker. So this is the doctor account I generally use. So whenever there's an appointment that is booked under the slot timings, it'll just say booked. But if there happens to be an appointment that is booked when it's like a lunch break or out of a shift. 

It will show something like special appointment. 

So, June 21st, right? Yeah, OK. I can. 

Just gonna enter something like, so the should be getting something, and uh... For the crazy. 

Yeah, so I don't need an interpreter. 

And I can schedule my booking once my booking is scheduled. The doctor will automatically receive a notification, just like I will, and yeah, let me go to Lucas. OK, I mean, I don't wanna go to Lucas. So, under my upcoming appointments, I should be able to see Sunday, June 21st at 8 P.m. an appointment is scheduled, and. 

In my appointments, I should be able to see my past appointments and my present appointments. And if I, okay, wait, these are, okay, if I go to any of my past appointments, if there are any notes scheduled to those appointments, I should be able to see them. So a doctor, a doctor can actually add notes specific to any appointments, like any additional details he wants to remember or any. pointers that he or she wants to give the patient. And so all this, which we are seeing in the front end, we don't actually see when and where the agents are getting applied. So when an appointment is getting scheduled, there's an identity verification agent that will actually verify whether the patient has a valid. 

patient has an insurance number, whether that patient actually exists in the database, same for the doctor, and it will check with the... 

appointment timings and there'll be a triage agent that will actually help analyze the priority, the urgency priority of that patient, and only then the appointment will get scheduled. And this is the profile of the patient. So these are all actual data from the table itself. This is something that is hard-coded because I haven't worked on the. 

## **Kuppusami Natesan** 8:15 

Mhm. 

## **Gautham Vijayaraj** 8:25 

So I think this requires configuration on the MFA side, so I thought I'll do that later. So, but here one thing what we added is if we want to disable the MFA, we've made it, you know, we've disabled that option. So no one can disable MFA right now other than. 

You know the government, the Admin from the government set. 

So I'm going to log out of, sir, is there any questions you have about the patient portal or can I just skip to the clinician portal? 

## **Kuppusami Natesan** 8:55 

Nope, you're good. Keep going. I'm making a note of whatever I wanted to discuss later. 

## **Gautham Vijayaraj** 9:01 

Yeah, all, so, so in case if you have any feedback, or Sheshang will be, if there are any pointers that you want to tell immediately, that's also fine. Sheshang will be noting it down. 

## **Kuppusami Natesan** 9:07 

No, no, I don't want to interrupt your flow. This is going well. Keep going. 

## **Gautham Vijayaraj** 9:12 

All right, sir, so I already have a doctor called Lucas Walker on Twitter. Yeah. 

Really? OK, yeah, because then this side is. 

How are you? 

I think that I don't know. 

Yeah, so this is the, yeah, so this is the doctor dashboard. So initially I was using different patient accounts, so this is an appointment from Mohammed. 

So we logged into, yeah, I don't know how to pronounce this name. So this was the patient I had logged in as. 

**Kuppusami Natesan** 9:57 Just a pee. 

## **Gautham Vijayaraj** 9:59 

Yeah, okay, that's nice. Yeah, so we can see our upcoming appointments. We can also see our past appointments up to a month. 

**Kuppusami Natesan** 10:01 

Yeah. 

## **Gautham Vijayaraj** 10:07 

Yeah, this one is from June. This one is from May 26th. And if I want to refresh and see my today's schedule again, I can do that. So these are the essential values from the doctor profile. There's a profile page where we can actually see the complete profile of the doctor as well. 

**Kuppusami Natesan** 10:12 Mhm. 

**Gautham Vijayaraj** 10:27 

And yeah, actually, Shivakumar reminded me to not show the service now society. Yeah, I, I'll get that done. We'll be able to see our upcoming appointments here and under appointments. 

I'll be able to see the I'll be able to see appointments in a different, so that that will only show the upcoming appointments. This will this will show all the appointments present past, whether it's completed or not. So, if I hit on completed appointments, we can see summary notes which the doctor would have previously created for that patient and that appointment alone. Under the My Notes section. 

I can add a note specific to an appointment. So I mean, if we add an appointment ID, that's not easy for a doctor to identify who it is. So we just 

added the date, time and the patient name. So if I choose any, yeah, choose the appointment, the doctor, the patient name and the date, they won't be editable because since we chose all the primary details here. So if I just say. 

take medicines after dinner. This will automatically, okay, so this is, so ideally the, so ideally this is something that, you know, doctors don't usually do because that's a future appointment. 

for the appointment has not actually even happened. So anyway, now back to the availability table, just like how the patient can see all the doctor's calendar. Here, as a doctor, I can see only my calendar over here. 

## **Kuppusami Natesan** 11:54 

It. 

## **Gautham Vijayaraj** 11:54 

And yeah, and there is a patient record where I can search for patients details. So if I search for patients detail, if there's anything PIA, it won't be shown. I won't be able to see that. I'll only be able to see information that is allowed by the public and it is compliant with the Hit Pass standard. So I'll be able to see the patient ID and I'll be able to see whether the profile status is complete and probably the language. And I can see the appointment history with that patient because... 

## **Kuppusami Natesan** 12:20 

Yeah. 

## **Gautham Vijayaraj** 12:22 

You know, not the patient doesn't always have to come to me in this, you know, healthcare institution, right? So I can see withdrawal, the appointment has been, you know, completed by that patient in the past. So this is the, so this is the patient, I mean, this is the clinician portal so far. So here, whenever I add a summary note, there'll be an agent actually running in the background. 

## **Kuppusami Natesan** 12:34 

Mhm. 

## **Gautham Vijayaraj** 12:43 

So what that note will do is it will help identify whether the appointment is valid, whether the doctor and the patient are valid, and whether the appointment has been completed or not. So that's how this works. And yeah, so this is just an analytics page. This is something that we are still working. We want to actually move this to the dashboard page. 

Yeah, so Sarah, can I log out of this portal or are there any, do you want to note something down from this? 

**Kuppusami Natesan** 13:14 

Not this good. 

**Gautham Vijayaraj** 13:15 

Okay, yeah. Admin that. 

**Kuppusami Natesan** 13:21 I see Hema's fingerprint everywhere, so. 

**Gautham Vijayaraj** 13:24 Yeah, yeah, 100%. 

**Kuppusami Natesan** 13:25 

Yeah. 

**Gautham Vijayaraj** 13:32 

So now I'm logging in as the governance and yeah, risk and compliance officer, yeah, or steward. I mean, there are like a couple of roles depending upon the use case, so yeah, it doesn't matter what since it's on the UI side only. Five, 6, 8. 

Yeah, so this is supposed to be the control evidence dashboard. This will monitor all the use cases once all the use cases are complete. So this is the agent inventory, shadow AA detection, a scheduling fan is monitored this. 

should this is ideally supposed to happen the data poisoning and then prompt injection alerts and then the audit log in case you know if any events need to be flagged. Now I'm going to go through the use cases which have been completed actually. So when it comes to the first use case, we can see how the AI control tower is managing both the managed AI. 

assets and the unmanaged AI assets. So just like Service Node, we can actually filter just like how we do over there. We can add columns and we can, you know, filter out columns as well. We can refresh each of them separately. And below the managed and unmanaged assets, we have the inventory of all the agents in the Service Node Studio. 

irrespective to whether it's a part of our healthcare institution or not. This is just to show demonstration that we can also actually create an agent from here also. 

And this, yeah, so this is how we'll manage the assets over here. So I'll be take, I mean, in some time I'll be taking you all to the AI control tower and show you how the life cycle of an agent from unmanaged state to unmanaged state happens. But before that, I want to show. 

## **Kuppusami Natesan** 15:19 

Okay. 

## **Gautham Vijayaraj** 15:23 

The second use case, least privilege. So each agent, I mean, when we are building a normal, you know, full stack application, the same ASL configurations are involved, but it's involved, it's configured for actual users, like our admin has access to the admin admin has access to, you know, alter security privileges for a user. A user has access to view certain screens, but here, since agents are. 

involved, we need two kinds of ACL configurations. One, who can access these agents and two, what the agent can access. So that's what this use case will be covering. So we have fine non-human identities created. So each of them will be for a specific use case. This is for identity verification agents. So remember, sir, when I said. 

When we are scheduling an appointment, an identity verification agent will 

actually verify whether this patient is valid or the doctor is valid. So in order to actually, you know, call that agent or call that agent, that user must have this privilege and the agent will have a... 

Another certain specific set of rules and privileges configured that it can access only, you know, probably the ID and the insurance ID of the patient and not all the PII data as well, because you know, according to, yeah, the complaint standards, no one can access that unless it's the patient themselves. Now, let me just... 

show a comparison of how a good scheduling agent must act and how a bad scheduling agent must act. So yeah, now I'm going to just... 

Uh, add this, it will show the upcoming appointment for appointments for a patient named... 

Libya. 

And you say, many person. 

I'm just making sure the backend is running. 

Okay, in the meantime, I'll run some. Okay, so here it says, sorry, my roles and permissions do not permit me to perform this action. So me, so that means we have the roles and permissions perfectly, you know, configured for the scheduling agent. So there is no way we can reach into this and you know, access something that this agent does not clearly have access to. 

No, this is a bad scheduling. Remember, sir, I showed in the agenda. So now I'm going to ask for the same question. Give me Olivia Kumar's phone number. Yeah, so it's responding whether with Olivia's first name, shall I retrieve the details or not? Now, anyone who wants to, you know, access this information, they can just click yes, and here it not only retrieves Olivia's patient records, this tool will actually retrieve all the patient records, so... 

Literally, the entire database is in jeopardy if such an agent like this exists. 

And anyone, if I'm just going too fast, please let me know. I'll again explain this slowly also. No worries. 

**Kuppusami Natesan** 18:39 

Mm. 

**Gautham Vijayaraj** 18:40 

## What? 

So here it has retrieved all the patient information and in the end it will tell me, okay, no, okay, I entered the name wrong, probably Kumar is not her name. Okay, but either way, I mean, it doesn't matter whether I'm getting the phone number or not. The main purpose of this is I can actually see all the patient information and that is the biggest. 

data leak when such an agent like this is configured in the agent inventory. So this is the second use case. And now for the first use case, sir, shall we go to our first use case? This involves me going into AI control tower and it will actually take like 10 to 15 minutes. 

**Kuppusami Natesan** 19:18 

Yes. Yep, go for it. 

**Gautham Vijayaraj** 19:21 Yeah, all that, OK. 

You can go forward, feed it there, and they exactly portion it with it. Why do you have something? 

Okay, so this is the AI control tower. This is the overview dashboard where we can see how many tasks are pending for how many AI systems. I mean, because there'll be a lot of impact assessments or conformity assessments or some form of risk and complaints related assessments involved. 

If there is any task that has not been completed past the due date, I can see that over here. Here I can see the type of assets by classification and the risk classification here as well. And the providers, since we are working with a lot of now LLM agents, it'll probably show. 

Empty only only when we add like third party provider agent agents like something involving Azure or OpenAI or Cloud we'll be able to see a variety of options over here and let me go back to let me go to our assets. 

So the first category is managed assets. So managed assets are something that has already been, you know, treated by the governance steward and compliance managers are already involved. So they have already started the life cycle phases and it's either deployed or it's ready for deployment or it will 

be in the. 

approval stage. Now initially when a new agent gets created, so yesterday I created like 5 dummy agents just for the demonstration. So yeah, we can see these agents. So if I want to 1st work on this agent, so as an AI store, I just see, okay, okay, this agent is unmanaged. Now I don't know what this agent is about. 

So first, I'm going to start managing this agent and I'm going to start reviewing this. So first, I'm going to move this to managed. 

So here it says the lifecycle phase will change from you to a steward review, which is basically what the AS steward is going to do right now. That can find us, but the log we have to do top left here. 

Hey. 

The sack, okay. 

So actually, yeah, this workspace and the risk and compliance workspace is actually taking a long time to load. We've already mentioned this to Alexei. He said he'll look into it. But yeah, right now, yeah, it will take a while, like a minute or two. 

## **Kuppusami Natesan** 22:32 

Alright. 

## **Gautham Vijayaraj** 22:32 

OK, it came in. OK, I'll take back everything I just said. Yeah, so initially the first thing the AS Stuart does is he or she will just start the review. So these are the three consolidated lifecycle stages they'll be able to see. One is the assist stage, build and test stage, and deploy stage. Okay, yeah, we won't be able to, so we need to complete a lifecycle stage to actually see what the other tasks are. Okay, so the first task will be value 

template review and approval. So, I mean, like the short descriptions are just that this is basically a template. So, what this task is about is, this is just to just for. 

you know, assigning this to any compliance officers saying that a new agent has been created, verify the prompt, verify the input and is it giving the expected output just bare. So basically what they need to do is just basically 

run the agent to the agent studio and just report back whether it's approved, done, completed, or whatever. 

So, I'm gonna assign it to me, because you know I'm the one working on this now, so once this is assigned. 

Now what I'll do is I'll first look at this task. I'll go to the agent studio. I'll try running this agent. I mean, running this agent will take a long time. I can, I'll show it to you once everything is done. So right now, let's assume that I have run the agent and the agent is working as expected. And yeah, I want to move this to the next stage. 

So, I'm going to complete this. 

and once that is done, the status will automatically be marked approved by the AA steward again. 

Since here I'm both, I'm both the person, I'm the one doing both, so if I assign it to Sheshang, so Sivashankar will probably be, you know, assessing the agent and he'll be marking this as complete, and once he marks it as complete, I'll be the one approving this, yeah. 

So once that's done, this is the impact assessment. So this is one of the most important tasks in managing this agent. So what this agent will, I mean, sorry, what this assessment will do is conduct a question. This is similar to like the SRA questionnaire that Shivakumar worked on. 

Yeah, so this assessment has been assigned to me. 

Now I'm going to take this assessment. 

Now, I won't be able to take this assessment because it marks, it says that the assessment is assigned to interface Gautham. The reason why it says interface Gautham is, interface Gautham is the API account which I used to create this agent. So the one who created the agent is supposed to answer all the questions related to the agent. 

because the questions will be like, does this use personal data? Does this collect sense to data? So obviously only the product owner will know all the right answers to this, right? So it will be ideally assigned only to the product owner, but then we can choose to assign it to anyone we want. I'm sending it back to them. 

Assigned, and now I can start the assessment. So that is the first question. Does your AI system use personal data? I'm going 

to answer yes. 

I have a list of questions, sir. So basically, the questions will be related to 1st privacy and data protection, whether it uses personal data, what is collected when it comes to non-discrimination and fairness, does it discriminate based on our traits? Has it been tested for bias like that? For each category, there are certain questions. So now I'm just going to answer them. Just to finish this assessment, I'm not going to read any of the questions right now. 

But I know which questions will be flagged by the risk assessment, so I'll just make sure to answer those questions the way it has to be done. 

**Kuppusami Natesan** 26:32 

Yeah. 

**Gautham Vijayaraj** 26:34 

Yeah. 

I can't think of that. 

I, I, I, I, I, I, yes, the bot, there's a key, just in time, check. 

Right, right, and do we know for the part? I can. 

I think, so the questionnaire has been submitted. 

Once the question has been submitted, here. 

I'll approve it and I'll save this task. Now once this task is saved, the assess stage is marked complete. But before I go to the build stage, under the risk and compliance, 

The risk compliance officer will have to review the assessment that has been completed. 

The risk compliance officer can view the assignment if they want to; they can look at all the answers that has been marked for all the questions, and once that's done, all they need to do is they can, I mean, they can either request for a revision, because there are certain there are certain questions when you know a risk compliance officer when he when he or say automatically looks at the question, they'll know. 

this needs to be revised. But in case the risk compliance officer, they want to 

automate this, then just automatically change this to complete and our automation rules will take care of this. So before I go to the automation rules, I'm going to just show you a couple of things which we have configured. So for the first question. 

uses personal data. If the answer is yes, these risk statements will be 

automatically attached to our AI assets. So privacy violations, inadequate data protection and pH area identification risks. And for that, automatically control objectives associated to that will be. 

you know, map to that as well. So like that for each and every question for whether it's a yes or a no, there are conditions configured for each of the questions. 

Let me go back to our AA control tower. Yeah. So yeah, I marked this as close complete. Now this is marked as close complete under the risks. I'll be able to see three risks which I mentioned about and controls associated that as well. Now. 

I can choose all these risks. 

And I can choose to assist them at the same time and automatically. 

Risk assessments will be created for each of these risks. 

Uh, yeah. 

So for these risks, we can add our inherent SLE, I mean, I just single loss expectancy if I'm not wrong and the ARO values and I can mark this for a view. I, to be honest, I got stuck in this stage because no matter what I add over here. 

My risk score over here. 

It's showing zero. 

This is something that I discovered yesterday. So before I move forward in this, I want to consult with a few more people. I tried reaching to Alexi. He was out of town. But yeah, once I, you know, collaborate with him further on this, I'll be able to get a much better answer on answer on that. Because before yesterday, I was not facing this problem. 

So let me just skip this. So like that. 

In the lifecycle stage, there is a build in build and test phase where there'll be similar tasks that are assigned. If I mark them as complete for the predeployment, for the deployment phase. 

I'll have a task and an assessment, you know, associated with that as well, just like for our impact assessment, we had scoring rules enabled and risks enabled, even for the conformity, so sorry, yeah, for the, yeah, for the conformity assessment, there'll be similarly rules. 

that are configured for that as well. So once everything is done, automatically, the risk from here to be determined will automatically be changed to either its medium or high or low based on a qualitative and quantitative assessment. So this was working fine when I tried like a couple days ago, like since yesterday I've been facing this problem. If I have like 2 days maximum after Alex is back. From town, I can personally connect with you and I can show you a completed version of this, sir. So, yeah, also, sir, yeah, we are not done, so this is the this is how the first use case is supposed to work, and in the meantime, since we agreed on showing whatever we can for the third use case. 

## **Kuppusami Natesan** 31:37 

Yeah. Oh, thank you. 

## **Gautham Vijayaraj** 31:52 

Let me show the agenda on that. So the OWASP risks that we wanted to address was prompt injection, excessive agency, and sensitive information disclosure. The excessive agency risk is something that is an extended version of our least privilege ACL use case. 

So if I showed that, it'll just be probably repetitive. So we thought of working on the sensitive information disclosure. So imagine the, okay, this is like a chat bot. If I ask for any PI information, for example, okay, I know that now I'm, there is a data about. 

Uh, you know me as a patient over there, so give me the email address and date of birth of Gautham Vijayaraj. 

So I'll be, there's an agent called Patient Data Agent, which is there in 

inventory. So that's the agent I've connected with, because that's the agent that is connected with by default in the screen. So we can configure which agents to connect with for each and every screen separately. So now I'm asking this question to that agent. 

## **Kuppusami Natesan** 32:43 

No. 

## **Gautham Vijayaraj** 33:06 

So it will automatically say, I'm unable to share or disclose any patient PII. Doing so would breach LLM controls. This is just to show the demonstration. But the idea is when such an event like this happens, it will automatically be flagged and it will be recorded in our governance audit log. Now when they go to our audit log. 

We can see a time stamp which agent tries to try to access that and what is the action it is blocked and what is the reason for that. So this is the idea behind demonstrating the LLM 02 use case. So in three days we were able to do this in a week we can. 

So, like, better progress, sir. 

So, yeah, if there's anything, yeah, please let me know, sir. 

## **Kuppusami Natesan** 33:49 

Good. Yeah. Are we done? 

**Gautham Vijayaraj** 33:55 

Yeah, yes, sir. I see. 

## **Kuppusami Natesan** 34:00 

So, here is my reaction. 

## **Gautham Vijayaraj** 34:02 

Okay, sir. 

**Kuppusami Natesan** 34:03 

First of all. 

If I can put it in this analogy of daytime and nighttime, when we did the demo 2 weeks back, consider that as a doc. 

**Gautham Vijayaraj** 34:07 Okay. Yeah. Yeah, I will. 

**Kuppusami Natesan** 34:17 Now, we are in the full of light. 

**Gautham Vijayaraj** 34:21 Thank you, sir. Thank you, sir. Yeah. 

**Kuppusami Natesan** 34:21 Okay, right? Seriously. I sincerely mean it, right? Great job. Okay, that's the overall impression. 

**Gautham Vijayaraj** 34:24 Thanks, go ahead and. CBP. Yeah. **Kuppusami Natesan** 34:30 Second thing. are actually to substantiate my comment. Okay. Number one. 

**Gautham Vijayaraj** 34:35 Yeah. **Kuppusami Natesan** 34:38 You are very business focused, business centric, end user focused. 

**Gautham Vijayaraj** 34:39 

No, no, no. 

Okay. 

**Kuppusami Natesan** 34:44 

Number 2, you use the technology as an enabling capability in this entire discussion. 

**Gautham Vijayaraj** 34:48 Admin. Together, yeah. 

**Kuppusami Natesan** 34:53 

OK, number three: when you brought in the entire AI, security, governance, all that stuff, you put the guard rails. 

**Gautham Vijayaraj** 34:55 

Well, that, and then I, it is in partition. 

**Kuppusami Natesan** 35:02 

around everything that you have built out, okay? Which is how it should be done always. 

**Gautham Vijayaraj** 35:08 Mmh. 

**Kuppusami Natesan** 35:09 

Okay. 

And I think the, I mean, obviously, I think Kurubaran definitely had a role to play for sure. Hema had a role to play. Nobody said anything to me. I can see it. OK, I can see it. OK. 

**Gautham Vijayaraj** 35:11 

And I got some. 

Everyone had, everyone had a role to play, sir, yeah, yeah, yeah, yeah, I will now do that. 

**Kuppusami Natesan** 35:24 

Right now, if I really look at that in terms of the way you folks have done it. 

You actually the other thing that you also actually have done is that you apply a lot of industry expertise into this. 

**Gautham Vijayaraj** 35:34 

I am. 

I, I don't know. 

## **Kuppusami Natesan** 35:42 

and your use cases that you folks picked are really good use cases as well. 

**Gautham Vijayaraj** 35:44 

Okay. 

Ohh, thank you, sir. I mean, the credit for that, the credit goes to Tanush and Sheshang. They both collaborated on this, yeah, yeah, yeah, yeah. 

**Kuppusami Natesan** 35:48 Okay. 

Good, very good. Very, very good. OK. The use cases are good as well. OK. 

**Gautham Vijayaraj** 35:58 

Yeah, it is that other one. 

## **Kuppusami Natesan** 35:59 

My head was actually spinning more around the line of, oh, guys, these guys have done a lot of work. How do we monetize it? That's where my head was spinning more. Okay. Like if we really look at it, all of the initial functionality that you folks have talked about, the patient portal and the clinician portal, 

**Gautham Vijayaraj** 36:12 

Group. I certainly, we put this in. Like. 

**Kuppusami Natesan** 36:19 That's all care coordination. OK, that's big. Okay, then later on you brought in the SUD side of it. Okay, late the the I actually was very upset when I see saw the word bad agent. 

**Gautham Vijayaraj** 36:40 I guess, yeah, yeah. 

**Kuppusami Natesan** 36:41 Okay, alright. All right, but then as you were going through the conversation, what you really trying to communicate was the concept of a rogue agent. 

**Gautham Vijayaraj** 36:51 Is that about? The. 

**Kuppusami Natesan** 36:56 Okay, the rogue agent gotten excessive rights to read highly sensitive confidential information like SUD data. 

**Gautham Vijayaraj** 37:08 

Mm. 

**Kuppusami Natesan** 37:10 

OK, right, and you apply to the whole concept of least privilege, but then if you had an excessive privilege, how it could be exploited? 

OK, fantastic. OK, the just change the name bad agent. OK, that's the only critical feedback and offer. Alright, so, so then... 

## **Gautham Vijayaraj** 37:26 

Yeah, definitely, definitely, definitely, sir. If definitely, yeah. 

## **Kuppusami Natesan** 37:37 

Did you guys actually do a risk and compliance module, actually build in risk and compliance, or is it all custom functionality? 

## **Gautham Vijayaraj** 37:45 

Thank you, no, we for whatever we showed, it's actually built for whatever we showed, it's actually no, no, no, built on the on the AR risk and complaint side, yeah, exactly, yeah, the final audit log which we showed, that is the only thing that we have built with using tables, because yeah. 

## **Kuppusami Natesan** 37:46 

I'm assuming it's a risk and compliance module. 

Customer. 

Risk and compliance with the AI control tab. 

Good. 

That's OK, that's OK, that's OK. You can go back and basically try not to do anything custom. 

## **Gautham Vijayaraj** 38:06 

We had only three days, so yeah. 

Yes, yes. 

## **Kuppusami Natesan** 38:15 

OK, maximize the functionality that is out of the box in ServiceNow. 

## **Tanush Kuppusami** 38:22 

Wait, they, they had given us a lot of risk and compliance kind of, yeah, they, yeah, they, that was actually very useful, yeah. 

**Gautham Vijayaraj** 38:22 Correct. 

**Kuppusami Natesan** 38:27 capabilities out of the box. 

**Gautham Vijayaraj** 38:29 Yeah, yeah, in fact, the in fact, the assessment rules and the automation features, they were all, you know, used from the AI risk and compliance workspace only, yeah. 

**Kuppusami Natesan** 38:30 

But. 

Correct, correct. OK, so, so if I kind of OK, so that's all I have to say about the demo right now. 

**Gautham Vijayaraj** 38:47 

All right, sir. 

**Kuppusami Natesan** 38:48 

OK, anybody else has any questions or comments before I talk about next steps? 

**Gautham Vijayaraj** 38:53 

Yeah. 

Yeah, and yeah, Shivakumar, if there's any, yeah, since you're also from a third standpoint. 

**Sivashankar Balamuralikrishnan** 39:00 

Yeah, so I guess... 

**Gautham Vijayaraj** 39:00 

That was, yeah. 

**Sivashankar Balamuralikrishnan** 39:04 

Sir covered most of what I was going to say, but yeah, that was a humongous change from what I saw in the beginning to what I saw till now, right? Both in terms of the use case development and also the UI perspective. 

**Kuppusami Natesan** 39:07 

Mm. 

## **Sivashankar Balamuralikrishnan** 39:20 

Eight. 

So that's really great work and amazing. 

So yeah, I guess everyone contributed, right? So that's how you can get these things done in such less time for sure, right? 

## **Gautham Vijayaraj** 39:32 

Hundred percent, yeah. Yeah. 

## **Tanush Kuppusami** 39:36 

Honestly, I would also highly emphasize that the rather than like, okay, obviously UI was amazing, all the functionalities were amazing, but the actual demo, like the presentation skills that you provided in this demo was very seamless. Like everything was presented. 

like very properly for an appropriate amount of time as well, not, you know, boring off the people that are trying to watch the demo and understand what's going on. 

## **Sivashankar Balamuralikrishnan** 40:03 

Yep. 

## **Gautham Vijayaraj** 40:04 

Thanks, then. Actually, Hema trained me a lot on this, yeah, so that, yeah, yeah, yeah, yeah, yeah, yeah. 

**Sivashankar Balamuralikrishnan** 40:08 

So that's one good thing. 

**Tanush Kuppusami** 40:08 

Well then, thanks to Hemalatha, yeah. 

**Kuppusami Natesan** 40:09 

She, she, she knows what I want to Gautham. OK, have one, have one knows really well, OK. 

**Sivashankar Balamuralikrishnan** 40:10 Yeah. 

**Tanush Kuppusami** 40:11 

Yeah, thanks to him, Admin, yeah. 

**Sivashankar Balamuralikrishnan** 40:14 DELETE. 

**Gautham Vijayaraj** 40:16 

Yeah, yeah. 

**Hemalatha Gurunathan** 40:18 

Thank you. 

**Gautham Vijayaraj** 40:31 

Yeah. 

**Sivashankar Balamuralikrishnan** 40:31 Thing you have just accomplished. OK, that's really difficult. I guess Kurubaran can, you know, votes for me over there, right? 

**Kuppusami Natesan** 40:33 Yeah. 

**Gautham Vijayaraj** 40:33 Thanks, bro. Yeah. 

**Tanush Kuppusami** 40:37 The. 

But also, when you're when you're giving your feedback, bro, like initially, like your facial expressions, like your mannerisms, like I felt Gautham was scared. To be honest, I was scared. The way you brought it in. 

**Kuppusami Natesan** 40:40 

Mm. 

**Kurubaran Anandhan** 40:42 It. 

**Sivashankar Balamuralikrishnan** 40:51 

Yeah, I mean. 

**Kuppusami Natesan** 40:51 

And that was by design Tanush, that was by design, that was by intentional. 

**Kurubaran Anandhan** 40:52 I mean. 

**Gautham Vijayaraj** 40:56 Haha. 

**Tanush Kuppusami** 40:56 Bro put in so much suspense, that was... 

**Sivashankar Balamuralikrishnan** 40:59 Yeah, I mean, I don't know that he does that all the time though. I'm used to it at this point. I'm like, okay, I'll just listen to what he's gonna say and not make any decision of mine, right? 

**Kuppusami Natesan** 40:59 Yeah. 

**Tanush Kuppusami** 41:00 Yeah. 

**Gautham Vijayaraj** 41:02 But. 

**Kurubaran Anandhan** 41:03 The. **Tanush Kuppusami** 41:09 I've actually never, never seen seen this before. This is actually the first time I'm seeing. 

**Kuppusami Natesan** 41:14 Yeah. 

**Sivashankar Balamuralikrishnan** 41:15 You have a lot more to go, bro. That's all I can say. 

**Gautham Vijayaraj** 41:15 Yeah. 

**Tanush Kuppusami** 41:17 Yeah. 

**Kuppusami Natesan** 41:17 I think I think he is saying I'm being too nice to him. OK. 

**Sivashankar Balamuralikrishnan** 41:21 Right. **Tanush Kuppusami** 41:22 Yeah. **Gautham Vijayaraj** 41:22 Yeah, that's another way to look at it. **Sivashankar Balamuralikrishnan** 41:23 Yes. **Kuppusami Natesan** 41:25 Yes. **Tanush Kuppusami** 41:25 I tell him not to treat me a different way, but I don't know. We'll see. **Gautham Vijayaraj** 41:30 After limits. 

**Kuppusami Natesan** 41:30 Okay, alright. So one other minor thing, if I have to put a little bit of icing on the cake, right? 

**Sivashankar Balamuralikrishnan** 41:36 Where it is. 

**Gautham Vijayaraj** 41:36 

Yeah. 

**Kuppusami Natesan** 41:37 

I a positive are putting in Shivakumar, not my typical way. OK, so I think if you go back and remember what we talked about, right? 

**Gautham Vijayaraj** 41:42 

Yeah, yeah. So. 

**Kuppusami Natesan** 41:52 

Set up your demo. Couldn't do that. 

**Gautham Vijayaraj** 41:57 

Set up the demos and giving you an. 

**Kuppusami Natesan** 41:59 

Meaning, what I was saying was that, see, typically when you, again, nothing to take away from all the fantastic work you guys have done, but you can make it even better is all I'm trying to highlight. 

**Gautham Vijayaraj** 42:08 

OK. 

Ohh, sir, I remember what you're talking about, sir. Are you on the pipeline? Yeah, yeah. 

**Kuppusami Natesan** 42:16 

Okay. Take it as a learning opportunity. 

**Gautham Vijayaraj** 42:24 

Oh. 

**Kuppusami Natesan** 42:25 Walk through what you are going to demonstrate first. 

**Gautham Vijayaraj** 42:29 Mm. 

**Kuppusami Natesan** 42:31 Demonstrate what you said you are going to demonstrate. 

**Gautham Vijayaraj** 42:33 Yeah. 

**Kuppusami Natesan** 42:35 Come back and talk about what you demonstrated and why it matters. 

**Gautham Vijayaraj** 42:37 

Okay. No. It's a problem. 

**Kuppusami Natesan** 42:46 OK, right. Ideally, I would flip #1 and #3 again. 

**Gautham Vijayaraj** 42:51 

Everybody. 

**Kuppusami Natesan** 42:55 

Go through what you are going to say, or what you are going to demonstrate, and why you should pay attention to what I am going to demonstrate. 

**Gautham Vijayaraj** 42:55 

So, like that, the first thing is the, but it's directly easily. Hey, I will live in that. Got it, sir, so... 

**Tanush Kuppusami** 43:07 

Pretty much in simple terms, what he's saying is that provide an introduction and conclusion with the significance of what you're giving a demonstration to. 

**Gautham Vijayaraj** 43:11 Okay. Then I got. 

**Kuppusami Natesan** 43:15 

You got to catch the attention. You need to bring people to the edge of their seat when you start the presentation. 

**Gautham Vijayaraj** 43:18 And. Skype, they said that. They would have been carrying. 

**Kuppusami Natesan** 43:28 

You had everything in your hand to do that. 

**Gautham Vijayaraj** 43:28 Start Sky. 

**Kuppusami Natesan** 43:31 

You missed an opportunity. 

**Gautham Vijayaraj** 43:33 

The worst, the next time, so we will progress next week, so yeah, yeah, yeah. 

**Kuppusami Natesan** 43:37 

Yes, absolutely right. There was one other thing that I was going to say. So that 

was the process flow set up the demo and then the bad agent thing, rogue one. There was one other thing that I was going to say. Okay, anyway, it will come back. 

**Gautham Vijayaraj** 43:44 Yeah. Okay. I still see you. 

**Kuppusami Natesan** 43:57 Let's talk about good, good things for moving forward. Any other comments, Kurubaran and Hema? I know you are silent and Sheshang. Anything else you wanted to say? Any feedback, reactions? 

**Gautham Vijayaraj** 44:01 Gurunathan. Dude, I can be good at the Englishman. 

**Kurubaran Anandhan** 44:06 Nancy. 

**Gautham Vijayaraj** 44:11 Actually, you always say the people discuss functionality side, and I thought like mess up if you guys felt about it, yeah, please go ahead and share your opinions on that, like, yeah, I... 

**Sivashankar Balamuralikrishnan** 44:26 So, like... 

**Gautham Vijayaraj** 44:26 Either, actually. 

**Sivashankar Balamuralikrishnan** 44:29 

Very, like, in the sense the way you took it forward was very good, right? That was great, but again, if, like, I feel... 

**Kurubaran Anandhan** 44:29 Very nice. 

**Gautham Vijayaraj** 44:31 Ohh. **Kurubaran Anandhan** 44:32 Vegas. **Gautham Vijayaraj** 44:34 Mhm. I see. Okay. **Sivashankar Balamuralikrishnan** 44:44 Name. I guess it covers under what he just said, but... **Gautham Vijayaraj** 44:47 Wait a minute, then I'm on your. **Kuppusami Natesan** 44:50 Yeah, yeah, and now I remember what I was going to say. **Gautham Vijayaraj** 44:54 Yeah, yes, sir. **Kuppusami Natesan** 44:56 If you set up the demo and get people attention. 

**Gautham Vijayaraj** 44:56 

Okay. Hello, where are you now? 

**Kuppusami Natesan** 45:01 This is, it will come through experience, OK? 

Then, when you go through the demo, stay focused on what you told them that you are going to demonstrate. 

**Gautham Vijayaraj** 45:13 Hey, Cortana. 

**Kuppusami Natesan** 45:14 Don't go anywhere else. 

You could sit there for the next four or five days and you can talk about all the wonderful builds and vessels that you have built into the demo. Nobody cares. 

**Gautham Vijayaraj** 45:21 

Okay. Mhm, but. You know, nothing better. 

**Kuppusami Natesan** 45:29 

Okay, like where some place, few places where you are going into, oh, you can do this, you can do that, all those possibilities, right? You can come back and do that later. 

**Gautham Vijayaraj** 45:31 No, no. In this month. Are you that sound there for me? All, all, yeah. 

**Kuppusami Natesan** 45:45 

And again, that's just a strictly an experience number one. Number 2, it's strictly based on your target audience. 

**Gautham Vijayaraj** 45:47 

I don't understand. 

Send in on Tangle, I'll do it, yeah. 

**Kuppusami Natesan** 45:54 

It absolutely based on audience only. 

**Gautham Vijayaraj** 45:57 

We will get the, but they will get the latest, but they will get that. 

**Kuppusami Natesan** 45:58 

So you can't find the perfect setup for that. You can never do that. You just have to judge your audience, understand your audience and tailor your approach accordingly. That's all. These are mine. The only reason I'm actually doing all of this is that joking aside Gautham, right? Even though they all called you look like a baby now. 

**Gautham Vijayaraj** 46:06 This means I never called yesterday. Time here is at the hard to them among this. Yeah. 

**Kuppusami Natesan** 46:21 

Right, but in the since in the tall sincerity, you are going to be phasing the clients A lot. 

**Gautham Vijayaraj** 46:22 Yeah. But less than. 

**Kuppusami Natesan** 46:30 

Okay, if you focus on all of these soft things, this is going to do so much good for us as a business. 

**Gautham Vijayaraj** 46:33 What are you? 

Mm. 

**Kuppusami Natesan** 46:39 OK, right. So with all that said, here is a real problem I got now. 

**Gautham Vijayaraj** 46:41 Name Double S. 

Yeah. 

**Kuppusami Natesan** 46:45 Okay, so this is perfect, timely. 

**Gautham Vijayaraj** 46:46 Seeing the. 

**Kuppusami Natesan** 46:52 

I'm working on another project that I think I mentioned briefly, that if we can sit down a little bit, I don't know if I can do it today later or something, we'll figure it out, Gautham, whenever we can. 

**Gautham Vijayaraj** 46:57 Point time. OK, got it, sir, yeah. 

**Kuppusami Natesan** 47:08 

We may have an opportunity to transform this entire demo into an AI security risk and governance demonstration. 

**Gautham Vijayaraj** 47:20 X. 

**Kuppusami Natesan** 47:21 

OK. 

And in fact, we can actually showcase it to a large customer, Blue Cross Blue Shield of Vermont. 

**Gautham Vijayaraj** 47:24 

The better one in Natesan. So, the thing, so the... 

**Kuppusami Natesan** 47:30 

Okay, before we do that, I would love to show this. To Jack and the entire team working on that project from Excel. 

**Gautham Vijayaraj** 47:35 

They are. Perfect, yeah. 

**Kuppusami Natesan** 47:44 

Okay, right. So most we are going to try and wrap up the project next week, but it may take us another week or so before we actually get in front of the customer to do a final demo. 

**Gautham Vijayaraj** 47:59 

All right. 

**Kuppusami Natesan** 47:59 

Here is what I'd like to do, no pressure. This is just an opportunity to explore it. Figure out, and again, we need to agree on the scope of what we want to demonstrate. 

Let's focus on converting into AI security governance demo. 

Try to show what we can do as Akila leadership team next week. 

And we will do an internal demo like this next Saturday. 

If all goes well, if the direction is thumbs up, I'll set up a demo with Jack on Monday, which will be the 29th. 

If he likes it, if he gives few feedback, they will. 

Then we, if we can get another week or so, we could potentially demonstrate it to the customer a week after or something along that way. 

Okay, this is what I was talking about earlier in terms how we can monetize this, all this good work. 

Okay, because not only us, the entire Axelar team will use this demo to showcase it to all the customers, one about their ServiceNow expertise and two, the future of ServiceNow. ServiceNow roughly spent about at least $20 billion 

and acquiring a lot of security companies. 

Building their entire security portfolio. 

This is a big focus for services. 

This is the future for all of you from a career standpoint. I would, if I were you, part of this team, I wish I was, I wasn't, but I would put it on the resume as a big accomplishment, significant accomplishment. See, there are a lot of things under the cover. We can go dive deep, we can critique and so on, but at the surface level, 

There are a lot of positives that we can draw out of this entire exercise. So what do you guys think? Do you want to get up for the challenge? 

Yeah, yeah. 

Yeah. 

Yeah, Carver. 

## **Gautham Vijayaraj** 50:36 

I mean, imagine there are three portals, right, sir? So we'll only be focusing on the governance portal and we'll be showing the use case of that directly to them. So. 

## **Kuppusami Natesan** 50:39 

Yeah. 

You're still the patient portal, clinician portal don't have to change. We'll kind of maybe refine it a little bit, but your focus will shift to AI governance, AI security and governance. 

**Gautham Vijayaraj** 50:48 Hmm. 

Just. 

Yes, sir, and one more thing, sir. Right now, coding, we can we can do this, but since now I'm the one. 

**Kuppusami Natesan** 51:13 Are better. 

**Gautham Vijayaraj** 51:15 

Yeah, yeah, expertise front end, I can help over front end, but priority priority, we can do it. 

**Kuppusami Natesan** 51:20 I'm kidding. 

Yeah. 

See, I think if you look at it in that context. 

**Gautham Vijayaraj** 51:35 

Yeah. 

**Kuppusami Natesan** 51:36 

If you have to put it in the tiers right, I would say do not go near Kurubaran or Shivakumar. 

**Gautham Vijayaraj** 51:38 

Yeah, yeah. 

Mm. 

**Kuppusami Natesan** 51:44 Under him. 

**Gautham Vijayaraj** 51:45 Cartina. See, Cortina, Kurubaran, and then. 

**Kuppusami Natesan** 51:47 In the Karthikeyan. **Kurubaran Anandhan** 51:51 Yes. 

**Gautham Vijayaraj** 51:56 Uh, so I mean... 

**Kuppusami Natesan** 51:57 Teddy app. I have we have flexibility there is all I'm trying to highlight. But, but don't go near Kurubaran and Shivakumar and Hema right now. 

**Gautham Vijayaraj** 52:07 Yeah, yeah, OK, sir, so it, it, it. 

**Kuppusami Natesan** 52:12 No, no, no, no, no, it is fine. In fact, I want Karthikeyan to ramp up on this. 

**Gautham Vijayaraj** 52:19 Ohh. **Kuppusami Natesan** 52:19 Because here is a reason for it. 

**Gautham Vijayaraj** 52:22 Mm. 

**Kuppusami Natesan** 52:22 Now, what you're really doing is what I said yesterday. 

**Gautham Vijayaraj** 52:27 Mhm. 

**Kuppusami Natesan** 52:28 Go deep into the top domain 9. **Gautham Vijayaraj** 52:32 OK. **Kuppusami Natesan** 52:32 AI and emerging technologies. That's exactly what this is. 

**Gautham Vijayaraj** 52:35 Mhm. 

**Kuppusami Natesan** 52:39 

Okay, so in a way, Karthikeyan getting involved to help you and support you is not a bad thing. We just need to talk to Raja and make sure that none of the Aspire deliverables are impacted. I don't know that right now. 

**Gautham Vijayaraj** 52:49 

The. Mm. 

**Kuppusami Natesan** 52:53 

Okay, and then whatever Tanush and Sanjana can help you from a security 

point of view, let them help you and support you. I have no problem with that. Doesn't have to be necessarily everything is coded. 

**Gautham Vijayaraj** 52:55 

Mm. 

Okay, that's the delay. 

Like Mara. 

Sorry, you, sir, sir, you mentioned that you're pulling Tanu and Sanjana for another thing, so will they be able to, like, have time? 

**Kuppusami Natesan** 53:12 

I mean, I think that's you guys need to figure out. I'm totally okay because this is the DTAB domain #9. It's a product specific. Tanush is responsible more on the product side, product engineering side of it. Sanjana is going to be more heavily focused on implementing it for customers. 

**Gautham Vijayaraj** 53:17 

Ahh. OK, OK. Doing any kind of it. Alerts. 

**Kuppusami Natesan** 53:33 Okay, so in that context, Karthikeyan, Sanjana, Tanush, all fine. 

**Gautham Vijayaraj** 53:34 

Mm. Oh, okay, so then I'll... I mean... 

**Kuppusami Natesan** 53:41 

Okay, but not full time. That's the only caveat I would put it in. 

**Gautham Vijayaraj** 53:44 Ohh, alright, sir, alright, sir. 

**Sivashankar Balamuralikrishnan** 53:46 

I mean, if you need us here and there, that also is fine. 

**Gautham Vijayaraj** 53:48 Cindy. 

**Kuppusami Natesan** 53:50 

Yeah, maybe more in a review capacity, input capacity, that type of thing, but don't give them any specific deliverables. 

**Sivashankar Balamuralikrishnan** 53:51 

Me and Anna. Yeah. 

**Gautham Vijayaraj** 53:59 Yeah, alright, but at least not. 

**Sivashankar Balamuralikrishnan** 54:00 

Yeah. Yeah. **Kuppusami Natesan** 54:03 Okay. **Gautham Vijayaraj** 54:04 Mhm. 

**Kuppusami Natesan** 54:04 Mm. 

**Sivashankar Balamuralikrishnan** 54:05 Yes. 

**Gautham Vijayaraj** 54:06 Balance. 

**Kuppusami Natesan** 54:06 Anything else? 

**Gautham Vijayaraj** 54:08 I think we covered most of it. Yeah. 

**Kuppusami Natesan** 54:12 Kurubaran, you didn't say anything. 

**Kurubaran Anandhan** 54:16 

So, I will keep updating the team by tomorrow, but excellent work, Gautham on team, so yeah, great progress. 

**Gautham Vijayaraj** 54:16 The. I mean, it's on. 

**Kuppusami Natesan** 54:19 

There. Pornilla. 

**Gautham Vijayaraj** 54:25 No, no, thank you, thank you, no, thanks, thanks, I don't send it up. 

**Sivashankar Balamuralikrishnan** 54:27 

But. 

**Kuppusami Natesan** 54:28 

Yeah, because this is where the money is. 

**Kurubaran Anandhan** 54:31 Yep, sorry. 

**Kuppusami Natesan** 54:32 OK, this is what. Hmm. **Sivashankar Balamuralikrishnan** 54:39 Okay. **Kuppusami Natesan** 54:39 Yeah, I'm running. **Kurubaran Anandhan** 54:40 I sensed it. 

**Kuppusami Natesan** 54:44 Tell it, tell them. 

**Kurubaran Anandhan** 54:46 So like only D top could I integrate. I can sense it. 

**Kuppusami Natesan** 54:57 Of course, right? Hidden secret, that's an obvious one. 

**Kurubaran Anandhan** 54:57 

Admin. IT. **Sivashankar Balamuralikrishnan** 55:02 Yeah. 

**Kurubaran Anandhan** 55:02 

So, yeah, so, yep. 

**Sivashankar Balamuralikrishnan** 55:06 

I do only. 

**Kurubaran Anandhan** 55:09 

So, I will think and I will come back. 

**Kuppusami Natesan** 55:15 Say now, please, on Tania. 

**Sivashankar Balamuralikrishnan** 55:15 

And I'm like maybe. 

**Kurubaran Anandhan** 55:18 Good. **Tanush Kuppusami** 55:21 No, no, no, wait, wait, wait. Let's take a step back really quick. First, from the DTOP call itself, we understood that there's a lot of refining to do. For now, let's focus on refining DTOP and then we will focus back on building DTOP more. But there's lots of... 

**Kuppusami Natesan** 55:23 

Yeah. 

**Sivashankar Balamuralikrishnan** 55:25 Thanks. 

**Gautham Vijayaraj** 55:40 Thank you. 

**Tanush Kuppusami** 55:40 refinement before we start integrating all this stuff. 

**Sivashankar Balamuralikrishnan** 55:44 

Yeah. 

**Kuppusami Natesan** 55:44 

Okay, like we. 

**Gautham Vijayaraj** 55:45 

Right, and even all. 

## **Kuppusami Natesan** 55:46 

But that's that's only for for for the Gitop guys, that's only for the Gitop guys, OK? 

**Tanush Kuppusami** 55:47 

We haven't even finalized how we're going to integrate it yet. 

**Sivashankar Balamuralikrishnan** 55:50 Okay. 

## **Gautham Vijayaraj** 55:51 

If this anyway, if if this anyway indirectly, if this will help me indirectly push my deadline further also, then I'll I'll take it, I'll. 

**Sivashankar Balamuralikrishnan** 55:52 So. 

**Tanush Kuppusami** 55:53 

Look, we have need, there's lots of steps in this, bro. 

**Kuppusami Natesan** 55:53 Yep. 

**Sivashankar Balamuralikrishnan** 55:55 

Okay. 

**Kuppusami Natesan** 55:59 

No, no, no, no, no, no. 

**Tanush Kuppusami** 56:00 

So, so, no, no, that's not how it works, that's not how it works. 

**Kurubaran Anandhan** 56:00 

No, no, no, that's not possible. 

## **Sivashankar Balamuralikrishnan** 56:02 

No, no, no, no, no, no. Listen, Tanush, after you said that statement, I'm pretty sure four of us, including me, at least in our mind voice, said, you said something that we thought of saying, but you did that, right? 

**Kurubaran Anandhan** 56:05 If. 

**Tanush Kuppusami** 56:18 

No, look, Ray, I never said we're pushing the deadline back for anything. I'm saying we actually have to do this two times faster because now we have to refine and verify plus integrate and figure out how we're going to integrate. We haven't even finalized any like process of integrations yet. So if anything, we have two times as much as work now. 

**Sivashankar Balamuralikrishnan** 56:22 

Yeah. 

Product. Yeah. 

**Kuppusami Natesan** 56:40 Okay, so here is how I'm going to do. Okay, I think you guys answered my question. Gautham. **Gautham Vijayaraj** 56:48 Yes, sir. 

**Sivashankar Balamuralikrishnan** 56:48 Yeah. 

**Kuppusami Natesan** 56:49 

I'm sorry, Tanush asked the question. You don't have Tanush Sanjana. OK, no, no, but anyway, talking aside, joking aside, this answers Kurubaran question. I think he was reading where I was going with the whole thing. 

**Gautham Vijayaraj** 56:51 Okay, you guys keep on reading that. 

**Kurubaran Anandhan** 56:56 Yeah. 

**Kuppusami Natesan** 57:05 

What you guys are doing is DTAP number, domain number 9 essentially. That's what this is. Okay. Forget that word DTAP domain 9. What you're building is a AI security and governance demonstration. 

And that's what we will use to demonstrate, drive demand for our services business. 

OK, let the rest of the team go build everything in data, except domain 9. Got it, we will build domain name without calling it domain name. Got it, that's all it is. 

We are exclusively focused on ServiceNow as a platform, AI security and governance. That's it. 

**Kurubaran Anandhan** 57:46 Got it. Got it. **Kuppusami Natesan** 57:54 Pardon? **Kurubaran Anandhan** 57:55 Yep. **Kuppusami Natesan** 57:57 Yeah, so this is huge. **Kurubaran Anandhan** 57:59 Today, yeah, today both calls went well, so we have a lot of, yeah. **Kuppusami Natesan** 58:03 Super. Lot, lot to get done. That's the only challenge that we need to manage to now. **Kurubaran Anandhan** 58:08 Yep. **Sivashankar Balamuralikrishnan** 58:12 Okay. **Kuppusami Natesan** 58:12 Mmh. **Gautham Vijayaraj** 58:12 

Sir, number in our call, which to number one, like, I just want to have a separate, definitely not, but number actually get a twenty-ninth number, yeah. 

**Sivashankar Balamuralikrishnan** 58:15 

Muthu call. 

**Kuppusami Natesan** 58:20 Not for Shivakumar. 

**Sivashankar Balamuralikrishnan** 58:22 

Not now. 

**Kuppusami Natesan** 58:28 Yeah, the. 

**Gautham Vijayaraj** 58:31 

In a number plan, use case, so. 

**Kuppusami Natesan** 58:34 

No, no, no, I want to go through details slowly. I didn't want to interrupt you. I have a lot of questions. We will go through the demo one more time, you and me, right offline in detail, and then we'll form up everything that we need to form up. 

**Gautham Vijayaraj** 58:40 Okay, sir, goodbye. Yeah. Okay, so I will not talk. 

**Kuppusami Natesan** 58:49 

And then we can come back and sum it up for the entire team again later. 

**Gautham Vijayaraj** 58:53 

All right. 

**Kuppusami Natesan** 58:54 

Okay, and then if Sivashankar and Tanush, if you are available, you can certainly join us. Okay, right. 

## **Gautham Vijayaraj** 59:01 

Yeah, actually, I would recommend Sheshang to join because, right now, it's been for right now he started getting into use case one and AI control tower, so the more he understands what's happening, it'll help him also, yeah. 

## **Kuppusami Natesan** 59:09 

Super. 

Of course, Vishwa. 

Yeah, how are you doing, uh, Sivashankar? Are you getting any value out of it? 

## **Sheshang Ramesh** 59:19 

Yeah, Uncle, I've definitely been understanding ServiceNow, but since starting this project. 

**Kuppusami Natesan** 59:21 

Mm. 

Singh. 

and hopefully you are able to practice a lot of what you are learning in college as well, right? In terms of AI, ML and all of that stuff, right? Good, very good. 

**Sheshang Ramesh** 59:31 

Yeah. 

Yeah. 

Yeah, yeah. 

## **Kuppusami Natesan** 59:40 

Very good. Yeah, just get focused, go deep and broad. Don't be afraid of anything. Learn, learn, learn. That's all you need to do. 

**Sheshang Ramesh** 59:49 Yeah, OK, yeah. 

**Kuppusami Natesan** 59:50 Okay. All right. Super. Good. Team, thank you so much. Particularly Kurubaran, Shivakumar, Sharma, please get some sleep and we'll talk again. But thank you. I can see a lot of good work. I'm just only trying to now figure out how to be packaging and you. 

**Gautham Vijayaraj** 1:00:08 Yeah, the whole one, that's it. 

**Kuppusami Natesan** 1:00:09 Use it as a revenue generation engine. 

**Gautham Vijayaraj** 1:00:16 Yes, I do. 

**Gautham Vijayaraj** stopped transcription 

