A tight reference on Amazon VPC — the mental model, CIDR math, every core component, a production reference architecture, and the exam / interview questions that actually come up.

## What a VPC is

A **VPC** (Virtual Private Cloud) is your own logically isolated network inside AWS, where you control the IP range, subnets, routing, gateways and security.

- **Mental model:** a VPC is your private data-center network in the cloud; a subnet is a network segment inside it.
- **Scope:** a VPC is **regional** and spans every AZ in its region. A subnet is **AZ-scoped** — one subnet lives in exactly one AZ.
- **Limit:** 5 VPCs per region by default (a soft limit you can raise).
- **Cost:** the VPC, subnets, route tables, internet gateway, security groups and NACLs are free. You pay for NAT gateways, interface endpoints, VPN, Transit Gateway, and public IPv4 addresses (charged hourly since February 2024).

> Every EC2 instance, RDS database, load balancer and EKS node lives in a VPC. Most cloud troubleshooting questions are really VPC questions.

## CIDR basics

A CIDR block like `10.0.0.0/16` defines an IP range: the number after the slash is how many bits are fixed, and the rest are available for hosts.

```
addresses = 2 ^ (32 − prefix)
```

| CIDR | Total addresses | Usable in an AWS subnet | Typical use |
|------|---:|---:|---|
| /16 | 65,536 | 65,531 | Whole VPC (largest allowed) |
| /20 | 4,096 | 4,091 | Default VPC subnets |
| /24 | 256 | 251 | Typical subnet |
| /26 | 64 | 59 | Small subnet |
| /27 | 32 | 27 | Very small subnet |
| /28 | 16 | 11 | Smallest allowed |

**Rules to memorize:**

- **Size limits:** VPC and subnet IPv4 blocks must be between `/16` and `/28`.
- **Use private ranges (RFC 1918):** `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.
- **5 reserved IPs per subnet.** For `10.0.1.0/24`: `.0` network address, `.1` VPC router, `.2` Amazon DNS, `.3` reserved for future use, `.255` broadcast (AWS has no broadcast, but still reserves it). **Usable = total − 5.**
- **Primary CIDR can't be changed** after creation. You can add **secondary CIDRs** (5 IPv4 blocks per VPC by default) that don't overlap existing ones.
- **No overlaps** between VPCs you'll ever connect (peering, Transit Gateway, VPN to on-premises). Plan ranges across all environments up front.
- **IPv6 (brief):** the VPC gets a `/56`, subnets get `/64`. IPv6 addresses are globally unique, so use an **egress-only internet gateway** for outbound-only access.

**Worked example:** `10.0.0.0/16` split into `/24` subnets gives 256 subnets of 256 addresses each (251 usable). Pick `/16` for production VPCs; running out of IPs later is painful to fix.

## Core VPC components

A VPC is built from a small set of parts; knowing each one's scope and one key fact covers most exam questions.

| Component | What it does | Scope | Key fact |
|---|---|---|---|
| **Subnet** | Segment of the VPC's IP range | One AZ | Public only if its route table sends `0.0.0.0/0` to an internet gateway |
| **Route table** | Decides where traffic goes | VPC | Each subnet uses exactly one; the `local` route can't be deleted |
| **Internet gateway (IGW)** | Two-way internet access | VPC (one per VPC) | Free, highly available, no bandwidth limit to manage |
| **NAT gateway** | Outbound-only internet for private subnets | One AZ | Lives in a public subnet; use one per AZ for HA; paid hourly + per GB |
| **Security group** | Firewall on an instance or network interface | ENI | **Stateful**; allow rules only |
| **Network ACL** | Firewall on a subnet | Subnet | **Stateless**; allow and deny rules, evaluated lowest number first |
| **Elastic IP** | Static public IPv4 address | Region | Charged hourly like any public IPv4 |
| **VPC endpoint** | Private access to AWS services | VPC | Gateway type (S3, DynamoDB) is free; interface type (PrivateLink) is paid |
| **VPC peering** | Private link between two VPCs | VPC pair | Not transitive; CIDRs can't overlap |
| **Flow logs** | Records IP traffic metadata | VPC, subnet or ENI | Main tool for network troubleshooting |

## Default VPC

Every AWS account gets one **default VPC per region**, built so you can launch an instance immediately with internet access.

**What it contains:**

- CIDR **`172.31.0.0/16`**
- One default subnet per AZ, each a **`/20`** (4,096 addresses)
- An internet gateway attached, and a main route table with **`0.0.0.0/0` → IGW** — so every default subnet is public
- **Auto-assign public IPv4** turned on in default subnets
- A default security group (allows inbound only from itself, all outbound) and a default NACL (allows all traffic both ways)
- DNS resolution and DNS hostnames enabled

If you delete it, you can create a new default VPC (console or `aws ec2 create-default-vpc`), but not restore the old one.

**Why not use it in production:** every subnet is public, and every account's default VPC uses the same CIDR, so connecting two of them (peering) is impossible.

## Creating a custom VPC

A custom VPC starts almost empty: *"VPC only"* gives you the VPC, a main route table with just the local route, a default NACL and a default security group — but no subnets and no internet gateway.

| | Default VPC | Custom VPC |
|---|---|---|
| Created by | AWS, automatically | You |
| CIDR | Always `172.31.0.0/16` | Your choice (`/16` to `/28`) |
| Subnets | One public `/20` per AZ | None until you create them |
| Internet gateway | Attached | None until you attach one |
| Good for | Quick tests and learning | Anything real |

### Reference architecture — two-AZ custom VPC

The standard production layout spreads public and private subnets across two AZs, with a NAT gateway per AZ.

```
                              Internet
                                 │  (two-way)
                                 ▼
                         Internet Gateway
         ┌────────────────┴───────────────┐
         │   VPC · 10.0.0.0/16 · region   │
         │ ┌───────────────┐ ┌───────────────┐
         │ │  AZ A         │ │  AZ B         │
         │ │ Public /24    │ │ Public /24    │
         │ │ 10.0.1.0/24   │ │ 10.0.2.0/24   │
         │ │ NAT GW + EIP  │ │ NAT GW + EIP  │
         │ │   ▲ outbound  │ │   ▲ outbound  │
         │ │ Private /24   │ │ Private /24   │
         │ │ 10.0.11.0/24  │ │ 10.0.12.0/24  │
         │ │ app servers,  │ │ app servers,  │
         │ │ no public IP  │ │ no public IP  │
         │ └───────────────┘ └───────────────┘
         └────────────────────────────────┘
```

**Build steps:**

1. Create the VPC: `10.0.0.0/16`, DNS hostnames enabled.
2. Create subnets in two AZs: public `10.0.1.0/24` and `10.0.2.0/24`; private `10.0.11.0/24` and `10.0.12.0/24`.
3. Create an internet gateway and attach it to the VPC.
4. Create a public route table with `0.0.0.0/0 → IGW`, associate both public subnets, and turn on auto-assign public IPv4 for them.
5. Create a NAT gateway with an Elastic IP in each public subnet.
6. Create one private route table per AZ with `0.0.0.0/0 →` the NAT gateway in that AZ, and associate the matching private subnet.
7. Create security groups chained by tier (load balancer → app → database), each referencing the previous tier's security group instead of IP ranges.
8. Good practice: add an S3 gateway endpoint and enable VPC flow logs.

**Design choices to be able to defend in an interview:**

- At least two AZs, because one AZ is a single point of failure.
- One NAT gateway per AZ for availability, or a single NAT gateway to save cost in dev environments.
- Unused space left in the `/16` for future subnets, such as a database tier or EKS pods.

The console's *"VPC and more"* option builds most of this at once. Build it step by step at least once so you know what each piece does.

## Exam traps and key facts

Most VPC exam questions test one of these points disguised inside a scenario.

- **"Public" is a routing fact, not a name.** A subnet is public only because its route table has `0.0.0.0/0 → IGW`.
- **Internet access needs all of:** a public IP or Elastic IP, a route to the IGW, a security group allowing the traffic, and a NACL allowing it in both directions.
- **Usable IPs = total − 5.** A `/28` gives 11, a `/24` gives 251.
- **Scope:** a VPC can't span regions; a subnet can't span AZs.
- **One IGW per VPC.**
- **NAT gateway** sits in a public subnet and serves one AZ. For HA, one NAT gateway per AZ, with each private subnet routing to the NAT in its own AZ. A NAT instance is the legacy option (needs source/destination check disabled).
- **Security groups are stateful** (return traffic allowed automatically) and allow-only. **NACLs are stateless**, so return traffic needs its own rule, usually ephemeral ports 1024–65535.
- **Default NACL allows everything**; a newly created custom NACL denies everything until you add rules.
- **Peering is not transitive.** If A peers with B and B with C, A can't reach C through B. Peered CIDRs can't overlap.
- **Gateway endpoints exist only for S3 and DynamoDB** and are free. Everything else uses interface endpoints (PrivateLink).
- **Primary CIDR is permanent;** add secondary CIDRs to grow.
- **Cost questions:** NAT gateway data processing is a common hidden cost; an S3 gateway endpoint avoids sending S3 traffic through NAT.

## Interview questions with model answers

Interviewers rarely ask definitions; they ask you to reason through a design or a failure. Practice saying these aloud in your own words.

**1. What makes a subnet public or private?**
Its route table. A public subnet has a route `0.0.0.0/0 →` internet gateway. A private subnet has no route to the IGW; it usually reaches the internet outbound-only through a NAT gateway.

**2. How does an instance in a private subnet download a package?**
The instance sends traffic to `0.0.0.0/0`, which its route table points to a NAT gateway in a public subnet. The NAT gateway translates the private IP to its Elastic IP and sends the request out through the IGW. Replies come back the same way. Nothing on the internet can start a connection to the instance.

**3. Design a VPC for a production 3-tier web app.**
A `/16` VPC across at least two AZs. Public subnets hold the load balancer and NAT gateways; private app subnets hold the application; private data subnets hold the database. One NAT gateway per AZ. Security groups chain tiers: the load balancer accepts 443 from the internet, the app accepts traffic only from the load balancer's security group, the database only from the app's. Add an S3 gateway endpoint and flow logs.

**4. How do you choose a VPC CIDR?**
Use a private RFC 1918 range, usually a `/16` for production so there's room to grow. Make sure it doesn't overlap other VPCs, other accounts or on-premises networks you may connect later, because overlapping ranges can't be peered or routed.

**5. Security group vs NACL — when would you use a NACL?**
Security groups are stateful, allow-only and attach to instances; they're the main control. NACLs are stateless, support deny rules and apply to whole subnets. Use a NACL when you need an **explicit deny**, such as blocking a known malicious IP range for a subnet.

**6. Two VPCs both use `10.0.0.0/16` and need to communicate. What are your options?**
Peering and Transit Gateway won't work with overlapping ranges. Options: re-address one VPC (best long term), or expose specific services through **PrivateLink**, which works across overlapping CIDRs because traffic goes through an endpoint, not routing.

**7. An EC2 instance in a public subnet isn't reachable from the internet. How do you troubleshoot?**
Check in order: does it have a public IP or Elastic IP; does the subnet's route table have `0.0.0.0/0 → IGW`; does the security group allow the port inbound; does the NACL allow inbound and outbound (including ephemeral ports); is the OS firewall open and the application actually listening. **VPC flow logs** show whether traffic is reaching the instance and being accepted or rejected.

## Active recall and hands-on drill

Review these on day 1, 3, 7, 14 and 30; answer from memory before checking the notes above.

**Recall prompts (question :: answer form for spaced repetition):**

- How many usable IPs in a `/27` subnet? :: **27** (32 − 5 reserved)
- What are the 5 reserved IPs in `10.0.1.0/24`? :: `.0` network, `.1` router, `.2` DNS, `.3` future use, `.255` broadcast
- Smallest and largest VPC CIDR? :: `/28` and `/16`
- What makes a subnet public? :: A route `0.0.0.0/0 →` internet gateway in its route table
- Where does a NAT gateway live, and what is its scope? :: In a public subnet; one AZ
- Default VPC CIDR and subnet size? :: `172.31.0.0/16` with a `/20` per AZ
- Security group vs NACL in one line? :: SG: stateful, allow-only, instance level. NACL: stateless, allow + deny, subnet level
- Can you change a VPC's primary CIDR? :: No; add secondary CIDRs instead
- Is VPC peering transitive? :: No
- Which services have gateway endpoints? :: S3 and DynamoDB only

**Hands-on drill (about 45 minutes):**

- Build the custom VPC above in the console, launch one instance in each subnet, and confirm the private one reaches the internet only through NAT.
- Break it on purpose: remove the `0.0.0.0/0` route, then fix it; add a NACL deny, then fix it.
- Delete everything (NAT gateways and Elastic IPs cost money) and rebuild from memory using the AWS CLI.
- Later in your roadmap: rebuild the same VPC in Terraform.
