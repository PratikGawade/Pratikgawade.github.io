The three things most VPC questions actually hinge on — the internet gateway, subnets, and route tables. What each one is, how they fit together, the gotchas that trip people up on the exam, and the questions interviewers ask when they want to see if you really understand it.

## Internet gateway (IGW)

An **internet gateway** is the VPC component that connects your VPC to the internet in both directions. It does two jobs:

- **A route target.** Route tables send internet-bound traffic (`0.0.0.0/0`, and `::/0` for IPv6) to it.
- **1:1 NAT for public IPv4.** An instance only knows its private IP; the OS never sees the public IP. The IGW translates between the instance's private IP and its public IP or Elastic IP.

**Key properties:**

- **Managed by AWS:** horizontally scaled, redundant and highly available. No size to choose, no bandwidth limit to manage, no single point of failure.
- **Free to create**; you pay only normal data-transfer and public IPv4 charges.
- **One-to-one attachment:** a VPC can have only one IGW, and an IGW attaches to only one VPC.
- **Lifecycle:** create it (state: *detached*), then attach it to a VPC. To delete it, detach it first; detaching fails while resources in the VPC still have public IPs or Elastic IPs mapped.
- **Egress-only internet gateway:** the IPv6 equivalent of a NAT gateway. It allows outbound IPv6 traffic and blocks connections started from the internet. Stateful, and free.

> Attaching an IGW alone gives nothing internet access. An instance needs **four things together**: an IGW attached, a route `0.0.0.0/0 → IGW` in its subnet's route table, a public IPv4 or Elastic IP, and security group + NACL rules that allow the traffic.

## Subnets

A subnet is a slice of the VPC's IP range that lives in **exactly one Availability Zone**; resources like EC2, RDS and load balancers are launched into subnets, not into the VPC directly.

**Core rules:**

- **One AZ per subnet.** A subnet can't span AZs. For high availability, create matching subnets in two or more AZs.
- **CIDR inside the VPC's CIDR**, sized `/16` to `/28`, and no overlap with other subnets in the same VPC.
- **5 reserved IPs per subnet** (first four and the last). Usable = total − 5.
- **A subnet's IPv4 CIDR can't be changed** after creation. Delete and recreate it instead.
- **200 subnets per VPC** by default (adjustable).

**Subnet types are defined by routing, not by a setting:**

| Type | Route table has | Typical contents |
|---|---|---|
| **Public** | `0.0.0.0/0 → internet gateway` | Load balancers, NAT gateways, bastion hosts |
| **Private** | No IGW route; often `0.0.0.0/0 → NAT gateway` | Application servers, EKS nodes |
| **VPN-only** | Route to a virtual private gateway | Workloads reached only from on-premises |
| **Isolated** | `local` route only | Databases that never need outside access |

**Settings worth knowing:**

- **Auto-assign public IPv4:** on by default in default subnets, off in subnets you create. Turn it on for public subnets, or attach an Elastic IP.
- **AZ names vs AZ IDs:** `us-east-1a` maps to different *physical* AZs in different accounts. AZ IDs like `use1-az1` are the same everywhere, so use them when coordinating across accounts.

**Sizing in practice:** a `/24` (251 usable) is a common default. Size up for workloads that use many IPs. On EKS, each pod usually takes a VPC IP. An Application Load Balancer needs subnets of at least `/27` with at least 8 free IPs.

## Route tables

A route table is a list of rules that decides where traffic leaving a subnet goes; each rule is a **destination CIDR plus a target**.

**Example public route table:**

| Destination | Target | Meaning |
|---|---|---|
| `10.0.0.0/16` | `local` | Anything inside the VPC stays inside |
| `0.0.0.0/0` | `igw-xxxx` | Everything else goes to the internet |

**Common targets:** `local`, internet gateway (`igw-`), NAT gateway (`nat-`), VPC peering (`pcx-`), Transit Gateway (`tgw-`), virtual private gateway (`vgw-`), gateway endpoint (via a prefix list), or a network interface (`eni-`) for an appliance.

**Rules to know:**

- **Local route:** every route table has one for the VPC's CIDR. You can't delete it, which is why all subnets in a VPC can reach each other by default.
- **Longest prefix match:** when several routes match, the most specific one wins. A packet to `10.0.5.20` matches both `10.0.0.0/16` and `0.0.0.0/0`; the `/16` wins.
- **Main route table:** created with the VPC. Any subnet without an explicit association uses it.
- **Custom route tables:** ones you create and explicitly associate with subnets.
- **Associations:** each subnet uses exactly one route table; one route table can serve many subnets.
- **Best practice:** keep the main route table private (local route only) and put the IGW route in a separate custom public route table. Then any new subnet is private by default, not accidentally public.
- **Blackhole routes:** if a route's target is deleted (for example, a NAT gateway), the route stays but shows status `blackhole` and drops traffic. A common troubleshooting finding.
- **Route propagation:** with a VPN, a virtual private gateway can add on-premises routes automatically (BGP).
- **Gateway route tables (edge association):** a route table attached to an IGW or virtual private gateway to steer *incoming* traffic through a firewall appliance. Advanced; know the name for the exam.
- **Limit:** 50 non-propagated routes per route table by default (adjustable).

## How they fit together

A subnet becomes public only by being associated with a route table that sends `0.0.0.0/0` to the internet gateway; everything else falls back to the main route table.

```
                      Internet
                         │
                         ▼
                 Internet Gateway
         ┌──────────────┴──────────────┐
         │   VPC · 10.0.0.0/16         │
         │                             │
         │  ┌──────────────────────┐   │
         │  │ Public RT            │   │
         │  │ 10.0.0.0/16 → local  │   │
         │  │ 0.0.0.0/0   → IGW    │   │
         │  └─────┬──────────┬─────┘   │
         │        │          │         │
         │  ┌─────▼────┐ ┌───▼──────┐  │
         │  │ Public A │ │ Public B │  │  ← explicitly associated
         │  └──────────┘ └──────────┘  │
         │                             │
         │  ┌──────────────────────┐   │
         │  │ Main RT (private)    │   │
         │  │ 10.0.0.0/16 → local  │   │
         │  └─────┬────────────────┘   │
         │        │                    │
         │  ┌─────▼───────────┐        │
         │  │ Private subnet  │        │  ← no explicit association →
         │  └─────────────────┘           uses the main route table
         └─────────────────────────────┘
```

**The path of a request from an instance in Public subnet A to the internet:**

1. The instance sends a packet from its private IP (`10.0.1.25` for example).
2. Its subnet's route table matches `0.0.0.0/0` and forwards the packet to the internet gateway.
3. The internet gateway swaps the private source IP for the instance's public IP and sends it out.
4. The reply arrives at the public IP; the internet gateway translates it back and delivers it to the instance.

The private subnet has no explicit association, so it uses the main route table, which has only the `local` route. Its instances can reach other subnets in the VPC but not the internet.

## Exam traps and key facts

These are the points scenario questions usually hinge on.

- **No internet despite an IGW?** Check the four requirements: IGW attached, route to it, public IP or Elastic IP, SG and NACL allowing traffic. **The missing route is the most common answer.**
- **An IGW is not a NAT gateway.** The IGW gives two-way access to instances with public IPs. Private instances need a NAT gateway (IPv4) or an egress-only IGW (IPv6) for outbound-only access.
- **One IGW per VPC, one VPC per IGW.**
- **IGW is highly available by design.** Answers suggesting *"add a second IGW for redundancy"* are wrong.
- **New subnets use the main route table** unless explicitly associated with another.
- **A subnet has exactly one route table at a time**, but one route table can serve many subnets.
- **The `local` route can't be deleted**, so subnets in the same VPC always have a route to each other. Restrict that traffic with security groups and NACLs, not routing.
- **Most specific route wins.**
- **Subnets are AZ-bound**; losing an AZ means losing its subnets, so spread across AZs.
- **Custom subnets don't auto-assign public IPs.** An instance launched into a *"public"* subnet without this setting or an Elastic IP still can't reach the internet.
- **IPv6 outbound-only = egress-only internet gateway**, not a NAT gateway.

## Interview questions with model answers

Practice answering aloud; interviewers follow up on the *"why"*, so know the reasoning, not just the fact.

**1. What does an internet gateway actually do?**
Two things. It's the route target for internet-bound traffic, and it performs 1:1 NAT between an instance's private IP and its public IP or Elastic IP. The instance itself only ever sees its private IP.

**2. Internet gateway vs NAT gateway?**
An IGW gives two-way internet access to resources with public IPs; anyone on the internet can start a connection if security rules allow. A NAT gateway lets private resources start outbound connections while blocking anything started from outside. The NAT gateway itself sits in a public subnet and sends traffic out through the IGW.

**3. An instance has a public IP but can't reach the internet. What do you check?**
The subnet's route table first: is there `0.0.0.0/0 → IGW`, and is the subnet associated with that route table rather than the main one? Then confirm the IGW is attached, the security group allows outbound, the NACL allows outbound *and* the return traffic on ephemeral ports, and no route is in `blackhole` state.

**4. What's your approach to the main route table?**
Keep it private, with only the `local` route, and create a separate public route table with the IGW route. Any subnet created without an explicit association then defaults to private, which **fails safe**.

**5. A route table has `10.0.0.0/16 → local` and `10.0.5.0/24 → a firewall appliance`. Where does traffic to `10.0.5.20` go?**
To the firewall. Routing uses longest prefix match, and `/24` is more specific than `/16`.

**6. How would you plan subnets for an EKS cluster?**
Private subnets in at least two AZs for nodes, sized generously because pods typically take VPC IPs (a `/19` or larger per AZ is common for busy clusters). Public subnets hold the internet-facing load balancers. Leave spare space in the VPC CIDR for growth.

**7. You deleted a NAT gateway by mistake. What happens to routing?**
The `0.0.0.0/0` route in the private route tables stays but shows as `blackhole`, and private instances lose outbound internet. Create a new NAT gateway and update the routes to point at it.

## Active recall and hands-on drill

Review on day 1, 3, 7, 14 and 30, answering from memory first. Prompts are in question :: answer form for spaced repetition.

- What two jobs does an internet gateway do? :: Route target for internet traffic, and 1:1 NAT between private and public IPs
- How many IGWs can a VPC have? :: One (and an IGW attaches to only one VPC)
- What's needed for an instance to reach the internet? :: Attached IGW, `0.0.0.0/0 → IGW` route, public IP or EIP, SG + NACL allowing it
- IPv6 outbound-only access uses what? :: Egress-only internet gateway
- Can a subnet span AZs? :: No, one subnet = one AZ
- Can you change a subnet's IPv4 CIDR? :: No; recreate the subnet
- Which route table does a new subnet use? :: The main route table, unless explicitly associated
- Two routes match a packet. Which wins? :: The most specific (longest prefix)
- Why keep the main route table private? :: New subnets then default to private, which fails safe
- What does a `blackhole` route mean? :: Its target was deleted, so matching traffic is dropped
- AZ name vs AZ ID? :: Names differ per account; IDs (`use1-az1`) are the same everywhere

**Hands-on drill (about 40 minutes, matching the course demo):**

- Create a VPC (`10.0.0.0/16`) with one public and one private subnet in different AZs.
- Create and attach an IGW; create a public route table with `0.0.0.0/0 → IGW` and associate only the public subnet.
- Enable auto-assign public IPv4 on the public subnet, launch an instance, and confirm it reaches the internet.
- Launch an instance in the private subnet and confirm it can't; check that it uses the main route table.
- Break and fix: disassociate the public route table, observe the failure, then restore it.
- Detach the IGW while the instance has a public IP and read the error; then clean everything up.
