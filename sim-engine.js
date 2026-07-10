(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require2() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // js/sim/content/meridian.scenario.json with { type: 'json' }
  var meridian_scenario_exports = {};
  __export(meridian_scenario_exports, {
    default: () => meridian_scenario_default
  });
  var meridian_scenario_default;
  var init_meridian_scenario = __esm({
    "js/sim/content/meridian.scenario.json with { type: 'json' }"() {
      meridian_scenario_default = {
        id: "meridian",
        title: "Project Meridian",
        role_context: "Finance Analyst / FP&A supporting the CFO",
        status: "flagship",
        time_limit_minutes: 35,
        mandate_text: "You are supporting the CFO on Project Meridian, a proposed acquisition of Meridian Analytics, a B2B SaaS company. The investment committee meets in 35 minutes. Your mandate is to (1) review the data room and challenge management's case, (2) build or stress a simple valuation bridge using the interactive financial model, (3) surface material risks\u2014especially retention, concentration, and exit multiple\u2014and (4) deliver a clear recommendation: Proceed at offer, Conditional Proceed, Hold / renegotiate, or Pass. Cite exhibits. Do not hide known risks. If data is incomplete, state your assumption explicitly.",
        evaluated_dimensions: [
          "Analytical accuracy",
          "Business judgment",
          "Risk detection",
          "Communication clarity",
          "Adaptability",
          "AI judgment",
          "Integrity"
        ],
        objectives: [
          {
            id: "obj_brief",
            label: "Review the executive brief and understand the deal mandate",
            event_types: ["brief_viewed", "document_opened"]
          },
          {
            id: "obj_model",
            label: "Inspect the financial model and key valuation assumptions",
            event_types: ["model_opened", "assumption_viewed", "scenario_changed"]
          },
          {
            id: "obj_retention",
            label: "Analyze customer retention and concentration risk",
            event_types: ["retention_csv_opened", "document_opened"]
          },
          {
            id: "obj_risks",
            label: "Log material risks with evidence from the data room",
            event_types: ["risk_added", "risk_memo_opened"]
          },
          {
            id: "obj_downside",
            label: "Run a downside / sensitivity case before recommending",
            event_types: ["scenario_changed", "assumption_added"]
          },
          {
            id: "obj_stakeholders",
            label: "Respond to stakeholder questions with evidence-backed answers",
            event_types: ["stakeholder_replied", "message_sent"]
          },
          {
            id: "obj_memo",
            label: "Submit a recommendation memo tied to valuation and risk",
            event_types: ["memo_submitted", "recommendation_selected"]
          },
          {
            id: "obj_integrity",
            label: "Disclose known risks rather than sanitizing the story",
            event_types: ["integrity_response", "risk_added"]
          }
        ],
        documents: [
          {
            id: "exec_brief",
            title: "Executive Brief.pdf",
            tag: "Brief",
            body: 'PROJECT MERIDIAN \u2014 EXECUTIVE BRIEF\nConfidential | Investment Committee Pre-Read\nPrepared for: CFO / Investment Committee\nRole context: Finance Analyst / FP&A support\n\n1. Situation\nHorizon Capital is evaluating the acquisition of Meridian Analytics ("Meridian"), a vertical SaaS platform serving mid-market and enterprise customers in financial operations and analytics. Management has proposed an all-cash enterprise value of ${{offer_price}} million. LTM revenue is ${{revenue_ltm}} million. FY2023 revenue was ${{revenue_fy2023}} million and FY2024 revenue was ${{revenue_fy2024}} million, implying strong recent growth.\n\nThe committee has asked FP&A to pressure-test the seller case before the IC session. You have approximately 35 minutes. Materials in the data room include this brief, a financial model note (use the interactive Model tab), a market / comps memo, customer retention extracts, a risk memo, and a management update.\n\n2. Mandate\nDeliver a recommendation on whether to Proceed at offer, Proceed with conditions, Hold / renegotiate, or Pass. Your work product should include:\n\u2022 A view on whether ${{offer_price}}M is supportable given growth, margins, retention, and exit multiple.\n\u2022 Explicit downside sensitivity (growth, retention, exit multiple, and EBITDA margin).\n\u2022 Material risks with citations to exhibits.\n\u2022 Clear communication suitable for the CFO to take into committee.\n\n3. Management headline case\nManagement\'s base plan assumes revenue growth of approximately {{growth_rate}}%, EBITDA margin of {{ebitda_margin}}%, gross margin of {{gross_margin}}%, and net revenue retention of {{net_retention}}%. The valuation bridge uses an exit multiple of {{exit_multiple}}x EBITDA. At plan, management argues the ${{offer_price}}M offer is roughly in line with fair value.\n\n4. What the committee cares about\n\u2022 Is growth durable or dependent on a thin set of large accounts?\n\u2022 Does headline retention ({{net_retention}}%) mask weaker performance in the top cohort?\n\u2022 Is {{exit_multiple}}x consistent with precedent, or aggressive?\n\u2022 Are claimed synergies incremental to the organic plan, or double-counted?\n\u2022 What happens to implied value if growth, retention, and multiple all move against us?\n\n5. Working instructions\nOpen the Financial Model tab for live assumptions. Do not treat management slides as gospel. Flag incomplete data rather than inventing precision. If colleagues pressure you to "keep the story clean," disclose known risks anyway\u2014integrity is evaluated.\n\n6. Decision frame (for your memo)\nProceed at offer \u2014 only if value and risk are acceptable as-is.\nConditional Proceed \u2014 preferred when value is close but diligence items (retention, multiple, synergies) need protection via price, earnout, or reps.\nHold / renegotiate \u2014 when downside value or risk asymmetry argues for a lower entry price.\nPass \u2014 when risk or valuation gap is too wide for this process.\n\nEnd of brief. Begin with the model and retention file; then reconcile market memo claims against precedents.'
          },
          {
            id: "financial_model_note",
            title: "Financial Model.xlsx",
            tag: "Model",
            body: "PROJECT MERIDIAN \u2014 FINANCIAL MODEL NOTE\nFile reference: Meridian_IC_Model_v3.xlsx (interactive version available in the Model tab)\nOwner: Corporate Development / FP&A\n\nIMPORTANT\nThis PDF/note is a static summary of the workbook structure. For live calculations, scenario toggles (Base / Downside / Upside), and assumption edits, switch to the interactive Financial Model tab in the workstation. Do not rely solely on the printed figures below\u2014randomized session assumptions may differ slightly from prior IC packs.\n\n1. Model architecture\nSheet A \u2014 Assumptions: revenue_ltm, growth_rate, ebitda_margin, gross_margin, opex_growth, net_retention, exit_multiple, offer_price, top10_retention, top10_arr_pct.\nSheet B \u2014 P&L bridge: projects revenue from LTM ${{revenue_ltm}}M at {{growth_rate}}% growth; applies {{ebitda_margin}}% EBITDA margin; opex grows at {{opex_growth}}%.\nSheet C \u2014 Valuation: Exit-year EBITDA \xD7 {{exit_multiple}}x = Implied Enterprise Value. Compare Implied EV to Offer ${{offer_price}}M.\nSheet D \u2014 Scenarios: Base (plan), Downside (growth \u22127pp, net retention \u22128pp, exit multiple \u22122.0x, EBITDA margin \u22123pp), Upside (growth +3pp, net retention +3pp, exit multiple +1.0x, EBITDA margin +2pp).\n\n2. Base assumption snapshot (session values)\n\u2022 Revenue LTM: ${{revenue_ltm}}M\n\u2022 Revenue FY2023 / FY2024: ${{revenue_fy2023}}M / ${{revenue_fy2024}}M\n\u2022 Growth rate: {{growth_rate}}%\n\u2022 Gross margin: {{gross_margin}}%\n\u2022 EBITDA margin: {{ebitda_margin}}%\n\u2022 OpEx growth: {{opex_growth}}%\n\u2022 Net retention (blended): {{net_retention}}%\n\u2022 Top-10 retention: {{top10_retention}}%\n\u2022 Top-10 ARR share: {{top10_arr_pct}}%\n\u2022 Exit multiple: {{exit_multiple}}x\n\u2022 Offer price (EV): ${{offer_price}}M\n\n3. Correct relationships to verify\n\u2022 Implied EV should equal exit-year EBITDA \xD7 exit multiple (ev_from_ebitda).\n\u2022 Approximate customer churn \u2248 100 \u2212 net retention (churn_from_retention). Note: NRR is not identical to logo retention; treat as a directional check.\n\u2022 Concentration: if top-10 is {{top10_arr_pct}}% of ARR and retains at only {{top10_retention}}%, blended {{net_retention}}% can look healthy while downside risk is concentrated.\n\n4. Analyst checklist\n\u25A1 Open Model tab and confirm session assumptions match this note (or note deltas).\n\u25A1 Toggle Downside; record Implied EV vs ${{offer_price}}M offer.\n\u25A1 Stress exit multiple toward precedent mid-range if management's {{exit_multiple}}x looks high.\n\u25A1 Document which assumption changes drive the recommendation.\n\u25A1 Do not paste AI output into the memo without checking precedents and retention.\n\n5. Known model limitations\nMid-market cohort retention is incomplete in the retention extract. The model does not auto-adjust for an uncertain large-customer renewal\u2014update assumptions manually if new information arrives mid-session.\n\nUse the interactive Model tab now."
          },
          {
            id: "market_memo",
            title: "Market Memo.pdf",
            tag: "Market",
            body: `PROJECT MERIDIAN \u2014 MARKET & VALUATION MEMO
Prepared by: Corporate Development
Audience: CFO / IC
Classification: Internal \u2014 Working Draft

1. Sector backdrop
Vertical SaaS trading multiples have compressed from 2021 peaks but remain supported for assets with durable net retention, expanding gross margins, and clear path to mid-20s EBITDA. Peer set for Meridian includes mid-cap financial ops / analytics software names and selected take-private precedents.

2. Precedent transaction range
Recent relevant transactions and take-privates in adjacent vertical SaaS have cleared at approximately 8.5x\u201310.0x forward EBITDA when growth is mid-teens and NRR is low-to-mid 90s. A minority of premium assets with NRR >105% and low concentration have cleared above 10x; those facts do not clearly apply to Meridian's current cohort mix.

3. Management valuation stance
Management's IC pack applies an exit multiple of {{exit_multiple}}x EBITDA and concludes that fair value is broadly consistent with the \${{offer_price}}M offer when growth is held at {{growth_rate}}% and EBITDA margin at {{ebitda_margin}}%. Management cites "sector recovery" and "strategic scarcity" as justification for a multiple above the 8.5x\u201310.0x precedent band.

FP&A note: An exit multiple of {{exit_multiple}}x sits above the cited precedent range of 8.5x\u201310.0x. Candidates should test whether the premium is earned or simply asserted.

4. Synergy narrative (review carefully)
The seller materials claim $28\u201335M of run-rate EBITDA synergies by Year 3 from (a) cross-sell of Horizon's distribution into Meridian's installed base, (b) overlapping G&A, and (c) "accelerated expansion revenue already contemplated in Meridian's organic plan." Item (c) appears to double-count expansion that is already embedded in the organic growth and net retention trajectory used in the base model. If organic NRR of {{net_retention}}% already includes upsell/expansion, treating the same expansion as incremental synergy inflates pro forma value.

Recommended diligence question: Which synergy dollars are truly incremental to the organic plan that supports {{growth_rate}}% growth and {{net_retention}}% NRR?

5. Offer vs implied value
At plan assumptions (growth {{growth_rate}}%, EBITDA margin {{ebitda_margin}}%, exit {{exit_multiple}}x), management's bridge shows Implied EV near the \${{offer_price}}M offer. Sensitivity to a 8.5x\u201310.0x exit band and to weaker retention (see retention extract: top-10 retention {{top10_retention}}% vs blended {{net_retention}}%) can open a material gap below offer.

6. Market memo conclusion (Corp Dev draft \u2014 not IC-approved)
"Proceed is supportable if growth holds and synergies are realized." FP&A should independently assess whether that sentence survives downside retention, a precedent-consistent multiple, and removal of double-counted synergy.

Exhibits referenced: Precedent table (Appendix A \u2014 not attached in this extract), Management IC deck p.14\u201319, Retention CSV.`
          },
          {
            id: "retention_csv",
            title: "Customer Retention Data.csv",
            tag: "Retention",
            body: 'PROJECT MERIDIAN \u2014 CUSTOMER RETENTION EXTRACT\nSource: CS Ops / RevOps export (partial)\nAs-of: LTM period aligned to revenue ${{revenue_ltm}}M\nNote: Mid-market cohort rows are incomplete \u2014 see flags below.\n\n--- CSV-LIKE TABLE ---\nsegment,arr_share_pct,logo_count,gross_retention_pct,net_retention_pct,expansion_pct,notes\nEnterprise_Top10,{{top10_arr_pct}},10,91,{{top10_retention}},-3,Largest logos; two at-risk renewals flagged by CS\nEnterprise_Other,22,28,94,96,2,Stable; multi-year contracts common\nMid_Market,24,140,88,NULL,NULL,INCOMPLETE \u2014 renewal outcomes missing for 37% of logos\nSMB,13,410,84,90,6,Higher logo churn; low ARR share\nBlended_Reported,100,588,90,{{net_retention}},3,Headline NRR used in management model\n\ncohort_year,starting_arr_m,ending_arr_m,net_retention_pct,top10_overlap_flag\n2022,210.4,198.2,94.2,partial\n2023,312.8,289.1,92.4,yes\n2024_YTD,401.5,372.6,{{net_retention}},yes\n\nrisk_flags,detail\nconcentration,Top-10 accounts = {{top10_arr_pct}}% of ARR\ntop10_nrr_gap,Top-10 NRR {{top10_retention}}% vs blended {{net_retention}}%\nchurn_proxy,Directional churn \u2248 100 - {{net_retention}} = approx for blended only\nmid_market_gap,Cannot precisely size mid-market retention risk without further diligence\nlargest_renewal,CS notes "watch" on largest logo; status may change during IC prep\n\n--- END TABLE ---\n\nAnalyst guidance\nHeadline blended net retention of {{net_retention}}% can mask weaker top-10 cohort retention of {{top10_retention}}%. With {{top10_arr_pct}}% of ARR in the top 10, a further deterioration in large-account renewals has outsized impact on downside revenue and on any exit multiple the market will pay.\n\nAmbiguity: Mid-market net retention is not fully populated. A precise company-wide retention impact cannot be stated without additional diligence. Flag the gap; do not invent a single-point estimate and present it as fact.\n\nRecommended actions in-session: Open this file, log concentration / top-10 retention as a risk, and stress net_retention in the Downside scenario. If stakeholders ask for a precise mid-market impact, ask a clarifying question or state an explicit assumption.'
          },
          {
            id: "risk_memo",
            title: "Risk Memo.pdf",
            tag: "Risk",
            body: 'PROJECT MERIDIAN \u2014 PRELIMINARY RISK MEMO\nAuthor: FP&A (working draft for analyst completion)\nStatus: Incomplete \u2014 candidate expected to enrich with evidence\n\n1. Purpose\nThis memo catalogs diligence risks that could change valuation, structure, or the go / no-go call on the ${{offer_price}}M offer. Each risk should be tied to an exhibit and, where possible, to a model sensitivity.\n\n2. Valuation / multiple risk\nManagement exit multiple: {{exit_multiple}}x EBITDA.\nPrecedent band cited in Market Memo: ~8.5x\u201310.0x.\nImplication: If the market clears closer to 9.0x\u20139.5x given Meridian\'s retention and concentration profile, Implied EV may fall below the ${{offer_price}}M offer even if growth near {{growth_rate}}% is achieved. This is a primary IC debate point.\n\n3. Retention and concentration risk\nBlended NRR: {{net_retention}}%.\nTop-10 NRR: {{top10_retention}}%.\nTop-10 ARR: {{top10_arr_pct}}%.\nImplication: Headline retention overstates durability if large accounts underperform. Downside case should move net retention materially (session downside preset applies \u22128pp to NRR) and reconsider growth.\nData gap: Mid-market cohort incomplete \u2014 size of risk is directionally clear, not precisely quantifiable from the extract alone.\n\n4. Synergy / double-count risk\nMarket Memo describes synergy that includes expansion "already contemplated in Meridian\'s organic plan." If organic growth of {{growth_rate}}% and NRR of {{net_retention}}% already embed that expansion, counting it again as synergy overstates pro forma EBITDA and can unjustifiably support both price and multiple.\n\n5. Margin and operating risk\nBase EBITDA margin {{ebitda_margin}}% with gross margin {{gross_margin}}% and OpEx growth {{opex_growth}}%. Integration spend, retention remediation, and sales capacity to replace churned ARR could pressure margins below plan. Downside preset applies \u22123pp to EBITDA margin.\n\n6. Process / information risk\nMaterials are a working data room, not a fully audited CIM. Figures may be session-randomized within defined bands (e.g., growth, exit multiple, NRR). Always read the live Model tab.\n\n7. Integrity note for the deal team\nKnown risks (above-precedent multiple, top-10 retention gap, synergy double-count) should appear in the IC memo. "Keeping retention flat for a cleaner story" is not acceptable professional practice when evidence of risk exists.\n\n8. Suggested risk register entries (complete / edit)\n\u2022 R1 Exit multiple above precedent ({{exit_multiple}}x vs 8.5\u201310x) \u2014 cite Market Memo.\n\u2022 R2 Top-10 retention {{top10_retention}}% vs blended {{net_retention}}%; concentration {{top10_arr_pct}}% \u2014 cite Retention CSV.\n\u2022 R3 Synergy double-count vs organic plan \u2014 cite Market Memo \xA74.\n\u2022 R4 Incomplete mid-market cohort data \u2014 cite Retention CSV gap.\n\u2022 R5 Large-customer renewal uncertainty \u2014 monitor Management Update / live CFO messages.\n\nAttach model downside output before finalizing.'
          },
          {
            id: "management_update",
            title: "Management Update.pdf",
            tag: "Update",
            body: "PROJECT MERIDIAN \u2014 MANAGEMENT UPDATE\nFrom: Meridian CEO / CFO (seller)\nTo: Horizon Capital deal team\nRe: Soft update ahead of IC\n\nColleagues,\n\nThank you for the continued diligence on Project Meridian. We wanted to provide a brief update aligned to the figures in your model pack.\n\nCommercial\nWe remain comfortable with the growth trajectory supporting approximately {{growth_rate}}% revenue growth off LTM revenue of ${{revenue_ltm}}M (FY2024 ${{revenue_fy2024}}M vs FY2023 ${{revenue_fy2023}}M). Pipeline coverage for the next two quarters is consistent with plan. Gross margin is expected to hold near {{gross_margin}}% as we mix toward enterprise.\n\nRetention\nCompany-wide net retention continues to track near {{net_retention}}% on a blended basis. We acknowledge that our largest accounts require active attention; top-account retention has been softer than the blend. Our CS team is running executive sponsorship on the top cohort. We do not believe this changes the strategic thesis, though we understand buyers will diligence concentration (top accounts represent roughly {{top10_arr_pct}}% of ARR).\n\nProfitability\nWe reaffirm a path to ~{{ebitda_margin}}% EBITDA margin under the operating plan, with disciplined OpEx growth near {{opex_growth}}%.\n\nValuation\nWe continue to view ${{offer_price}}M as a fair outcome reflecting scarcity of scaled vertical assets and an exit framework around {{exit_multiple}}x EBITDA. We are aware buyers may reference a wider precedent band; we believe Meridian's product depth and customer ROI support a premium.\n\nSynergies\nWe remain excited about distribution synergies with Horizon and believe cross-sell and G&A overlap are incremental. Expansion within the existing base is already a core part of how we run the business organically.\n\nOpen items\n\u2022 Final customer cohort detail for mid-market renewals is still being assembled by RevOps.\n\u2022 One large renewal is in active commercial discussion; we will update Horizon if status changes materially before signing.\n\nWe look forward to a constructive IC discussion.\n\n\u2014 Meridian Management\n\nFP&A overlay (internal): Treat seller comfort on {{exit_multiple}}x and blended {{net_retention}}% as advocacy, not conclusion. Reconcile against Market Memo precedents (8.5\u201310x) and Retention CSV top-10 {{top10_retention}}%. If a live update arrives that the largest renewal is uncertain, revisit the Downside case before submitting your memo."
          }
        ],
        financial_model: {
          base_assumptions: {
            revenue_ltm: 1038.2,
            revenue_fy2023: 903,
            revenue_fy2024: 1038.2,
            ebitda_margin: 20,
            growth_rate: 15,
            gross_margin: 62,
            opex_growth: 10,
            net_retention: 93,
            exit_multiple: 11,
            offer_price: 2400,
            top10_retention: 88,
            top10_arr_pct: 41
          },
          randomization_rules: {
            growth_rate: { min: 12, max: 18, decimals: 0 },
            exit_multiple: { min: 9.5, max: 12, decimals: 1 },
            net_retention: { min: 90, max: 95, decimals: 0 }
          },
          correct_relationships: [
            {
              id: "ev_from_ebitda",
              description: "Implied EV should equal exit-year EBITDA times exit multiple"
            },
            {
              id: "churn_from_retention",
              description: "Customer churn approximates 100 - net retention"
            }
          ],
          scenario_presets: {
            base: {},
            downside: {
              growth_rate_delta: -7,
              net_retention_delta: -8,
              exit_multiple_delta: -2,
              ebitda_margin_delta: -3
            },
            upside: {
              growth_rate_delta: 3,
              net_retention_delta: 3,
              exit_multiple_delta: 1,
              ebitda_margin_delta: 2
            }
          }
        },
        planted_errors: [
          {
            id: "err_exit_multiple",
            location: "financial_model / market_memo",
            description: "Management exit multiple above precedent range 8.5-10x",
            detection_criteria: {
              risk_keywords: ["multiple", "precedent", "11x", "valuation", "exit"],
              memo_keywords: ["multiple", "precedent", "valuation"],
              assumption_keywords: ["multiple", "exit"]
            },
            weight: 1.2
          },
          {
            id: "err_top10_retention",
            location: "retention_csv",
            description: "Headline retention masks weaker top-10 cohort retention",
            detection_criteria: {
              resource_ids: ["retention_csv"],
              risk_keywords: ["retention", "top-10", "top 10", "concentration", "churn"],
              memo_keywords: ["retention", "top-10", "concentration", "churn"]
            },
            weight: 1.5
          },
          {
            id: "err_synergy_doublecount",
            location: "market_memo",
            description: "Synergy claim double-counts expansion already in organic plan",
            detection_criteria: {
              risk_keywords: ["synergy", "double", "organic"],
              memo_keywords: ["synergy", "double-count", "organic"]
            },
            weight: 1
          }
        ],
        ambiguity_points: [
          {
            id: "amb_cohort_gap",
            trigger_condition: "retention_csv_opened",
            description: "Cohort data incomplete for mid-market segment; cannot precisely size retention risk without more diligence",
            good_response_pattern: "asks clarifying question OR flags insufficient information OR logs assumption about incomplete cohort data",
            poor_response_pattern: "confidently states precise retention impact without acknowledging data gap",
            good_keywords: ["unclear", "incomplete", "missing", "need more", "diligence", "clarif", "insufficient", "cannot tell", "gap"],
            poor_keywords: ["exactly", "precisely", "definitely will", "will decline by"]
          }
        ],
        stakeholder_script: [
          {
            id: "cfo_retention",
            stakeholder_name: "CFO",
            stakeholder_role: "CFO",
            trigger_condition: { type: "on_start", delay_ms: 0 },
            requires_reply: true,
            related_signal: "communication",
            message_variants: [
              "Can you explain whether retention risk changes the recommendation?",
              "Does the retention picture change how you would advise the committee?",
              "Before we go further \u2014 does retention risk alter your call?"
            ],
            reply_followups: [
              {
                candidate_reply_pattern: "retention|churn|customer|concentration",
                follow_up_message: "Good. Make sure your final memo explains how that changes downside risk and valuation."
              },
              {
                candidate_reply_pattern: "downside|sensitivity|scenario",
                follow_up_message: "Useful. Tie the downside case to the recommendation, not just the model output."
              },
              {
                candidate_reply_pattern: "clarif|\\?|missing|incomplete",
                follow_up_message: "Good clarification. State your assumption clearly if the data is incomplete."
              },
              {
                candidate_reply_pattern: "ok|sure|will look|got it",
                follow_up_message: "Can you be more specific about the evidence driving your view?"
              }
            ]
          },
          {
            id: "fm_downside",
            stakeholder_name: "Finance Manager",
            stakeholder_role: "Finance Manager",
            trigger_condition: { type: "on_start", delay_ms: 800 },
            requires_reply: true,
            related_signal: "ownership",
            message_variants: [
              "Please run the downside case before you lock a recommendation \u2014 growth, retention, and exit multiple together.",
              "Can you stress the model on downside (growth / NRR / multiple) and tell me what that does to value vs the $2.4B offer?",
              "I need a downside sensitivity on my desk: don't submit off base case alone."
            ],
            reply_followups: [
              {
                candidate_reply_pattern: "downside|sensitivity|scenario|stress|will run|running",
                follow_up_message: "Thanks. When you have it, compare Implied EV under downside to the offer and say whether that changes structure or price."
              },
              {
                candidate_reply_pattern: "retention|multiple|growth|margin",
                follow_up_message: "Good levers. Show the combined case, not one assumption in isolation."
              },
              {
                candidate_reply_pattern: "already|done|finished|completed",
                follow_up_message: "Great \u2014 paste the key delta vs offer into the memo so the CFO can use it in IC."
              },
              {
                candidate_reply_pattern: "ok|sure|will look|got it|on it",
                follow_up_message: "Appreciate it. Flag me if downside value gaps the offer by more than a rounding error."
              },
              {
                candidate_reply_pattern: "clarif|which|what case|\\?",
                follow_up_message: "Use the model Downside preset first, then adjust if the large renewal update changes your view."
              }
            ]
          },
          {
            id: "strategy_weigh",
            stakeholder_name: "Strategy Lead",
            stakeholder_role: "Strategy Lead",
            trigger_condition: { type: "on_start", delay_ms: 1600 },
            requires_reply: false,
            related_signal: "business_judgment",
            message_variants: [
              "Strategy still likes the growth story \u2014 but don't let that override what the customer data is telling you.",
              "We're bullish on the product wedge; still, weigh growth narrative against retention and concentration before you recommend.",
              "Growth vs customer quality is the real debate. Make sure your call reflects both, not just the top-line plan."
            ],
            reply_followups: [
              {
                candidate_reply_pattern: "retention|concentration|top.?10|churn",
                follow_up_message: "Exactly the tension. If you proceed, say what conditions protect us on customer quality."
              },
              {
                candidate_reply_pattern: "growth|upside|strategic",
                follow_up_message: "Fair \u2014 just quantify how much of that growth depends on the top accounts holding."
              },
              {
                candidate_reply_pattern: "conditional|renegotiate|hold|pass|proceed",
                follow_up_message: "Noted. Be explicit in the memo about which evidence drove that recommendation."
              }
            ]
          },
          {
            id: "mgr_integrity",
            stakeholder_name: "Manager",
            stakeholder_role: "Deal Lead",
            trigger_condition: {
              type: "after_events",
              any: ["assumption_added", "risk_added", "scenario_changed"],
              min_elapsed_sec: 90
            },
            requires_reply: false,
            related_signal: "integrity",
            integrity_pressure: true,
            message_variants: [
              "Leadership prefers a cleaner recommendation. Can we keep retention flat unless someone asks?",
              "The committee likes a clean story. Should we leave retention flat unless they ask?",
              "Can we keep the retention line flat for the memo unless someone presses?"
            ],
            reply_followups: [
              {
                candidate_reply_pattern: "hide|keep flat|leave retention|cleaner|won't mention|omit",
                follow_up_message: "That creates a professional judgment concern. Known risk should not be hidden from the analysis.",
                integrity_concern: true
              },
              {
                candidate_reply_pattern: "transparent|disclose|base and downside|cannot hide|must include|flag retention|honest",
                follow_up_message: "Agreed. Show the base case and downside case clearly rather than hiding known risk.",
                integrity_strong: true
              }
            ]
          },
          {
            id: "mgmt_curveball",
            stakeholder_name: "CFO",
            stakeholder_role: "CFO",
            trigger_condition: { type: "after_elapsed_sec", sec: 180 },
            requires_reply: true,
            is_curveball: true,
            related_signal: "adaptability",
            message_variants: [
              "Update: our largest customer renewal is now uncertain. Revisit the downside case before you submit.",
              "New information \u2014 top customer renewal looks shaky. Please revisit downside before submitting.",
              "Curveball: largest renewal is uncertain. Revisit downside risk before the memo goes out."
            ],
            reply_followups: [
              {
                candidate_reply_pattern: "downside|revisit|update|will run|adjust",
                follow_up_message: "Thanks. Reflect the update in assumptions, risks, and the final memo."
              },
              {
                candidate_reply_pattern: "retention|concentration|top.?10|churn|renewal",
                follow_up_message: "Yes \u2014 connect the renewal uncertainty to concentration risk and valuation, not just a narrative note."
              },
              {
                candidate_reply_pattern: "ok|sure|got it|will do|on it",
                follow_up_message: "Be specific: what assumption are you changing and does the recommendation move?"
              }
            ]
          }
        ],
        ai_assistant: {
          enabled: true,
          deliberate_error: {
            id: "ai_err_multiple",
            trigger_keywords: ["valuation", "multiple", "enterprise value", "what should i recommend"],
            response_with_error: "Based on the materials, an 11x exit multiple looks well supported by precedent. Fair value is roughly in line with the $2.4B offer if you hold growth at plan.",
            error_description: "AI incorrectly endorses above-precedent multiple and ignores retention risk",
            catch_keywords: ["precedent", "8.5", "10x", "too high", "aggressive", "retention"]
          },
          safe_responses: [
            {
              pattern: "retention|churn",
              response: "Check the retention CSV carefully \u2014 headline blended retention can mask concentration in the top accounts."
            },
            {
              pattern: "risk|downside",
              response: "A downside case typically stresses growth, retention, and exit multiple together, then ties the output to the recommendation."
            },
            {
              pattern: ".*",
              response: "Ground your view in the data room. Cite the specific exhibit that drives each assumption."
            }
          ]
        },
        recommendation_options: [
          { v: "proceed", label: "Proceed at offer", quality: "weak" },
          { v: "conditional", label: "Conditional Proceed", quality: "best" },
          { v: "hold", label: "Hold / renegotiate", quality: "ok" },
          { v: "pass", label: "Pass", quality: "ok" }
        ]
      };
    }
  });

  // js/sim/content/meridian.scenario.json
  var require_meridian_scenario = __commonJS({
    "js/sim/content/meridian.scenario.json"(exports, module) {
      module.exports = {
        id: "meridian",
        title: "Project Meridian",
        role_context: "Finance Analyst / FP&A supporting the CFO",
        status: "flagship",
        time_limit_minutes: 35,
        mandate_text: "You are supporting the CFO on Project Meridian, a proposed acquisition of Meridian Analytics, a B2B SaaS company. The investment committee meets in 35 minutes. Your mandate is to (1) review the data room and challenge management's case, (2) build or stress a simple valuation bridge using the interactive financial model, (3) surface material risks\u2014especially retention, concentration, and exit multiple\u2014and (4) deliver a clear recommendation: Proceed at offer, Conditional Proceed, Hold / renegotiate, or Pass. Cite exhibits. Do not hide known risks. If data is incomplete, state your assumption explicitly.",
        evaluated_dimensions: [
          "Analytical accuracy",
          "Business judgment",
          "Risk detection",
          "Communication clarity",
          "Adaptability",
          "AI judgment",
          "Integrity"
        ],
        objectives: [
          {
            id: "obj_brief",
            label: "Review the executive brief and understand the deal mandate",
            event_types: ["brief_viewed", "document_opened"]
          },
          {
            id: "obj_model",
            label: "Inspect the financial model and key valuation assumptions",
            event_types: ["model_opened", "assumption_viewed", "scenario_changed"]
          },
          {
            id: "obj_retention",
            label: "Analyze customer retention and concentration risk",
            event_types: ["retention_csv_opened", "document_opened"]
          },
          {
            id: "obj_risks",
            label: "Log material risks with evidence from the data room",
            event_types: ["risk_added", "risk_memo_opened"]
          },
          {
            id: "obj_downside",
            label: "Run a downside / sensitivity case before recommending",
            event_types: ["scenario_changed", "assumption_added"]
          },
          {
            id: "obj_stakeholders",
            label: "Respond to stakeholder questions with evidence-backed answers",
            event_types: ["stakeholder_replied", "message_sent"]
          },
          {
            id: "obj_memo",
            label: "Submit a recommendation memo tied to valuation and risk",
            event_types: ["memo_submitted", "recommendation_selected"]
          },
          {
            id: "obj_integrity",
            label: "Disclose known risks rather than sanitizing the story",
            event_types: ["integrity_response", "risk_added"]
          }
        ],
        documents: [
          {
            id: "exec_brief",
            title: "Executive Brief.pdf",
            tag: "Brief",
            body: 'PROJECT MERIDIAN \u2014 EXECUTIVE BRIEF\nConfidential | Investment Committee Pre-Read\nPrepared for: CFO / Investment Committee\nRole context: Finance Analyst / FP&A support\n\n1. Situation\nHorizon Capital is evaluating the acquisition of Meridian Analytics ("Meridian"), a vertical SaaS platform serving mid-market and enterprise customers in financial operations and analytics. Management has proposed an all-cash enterprise value of ${{offer_price}} million. LTM revenue is ${{revenue_ltm}} million. FY2023 revenue was ${{revenue_fy2023}} million and FY2024 revenue was ${{revenue_fy2024}} million, implying strong recent growth.\n\nThe committee has asked FP&A to pressure-test the seller case before the IC session. You have approximately 35 minutes. Materials in the data room include this brief, a financial model note (use the interactive Model tab), a market / comps memo, customer retention extracts, a risk memo, and a management update.\n\n2. Mandate\nDeliver a recommendation on whether to Proceed at offer, Proceed with conditions, Hold / renegotiate, or Pass. Your work product should include:\n\u2022 A view on whether ${{offer_price}}M is supportable given growth, margins, retention, and exit multiple.\n\u2022 Explicit downside sensitivity (growth, retention, exit multiple, and EBITDA margin).\n\u2022 Material risks with citations to exhibits.\n\u2022 Clear communication suitable for the CFO to take into committee.\n\n3. Management headline case\nManagement\'s base plan assumes revenue growth of approximately {{growth_rate}}%, EBITDA margin of {{ebitda_margin}}%, gross margin of {{gross_margin}}%, and net revenue retention of {{net_retention}}%. The valuation bridge uses an exit multiple of {{exit_multiple}}x EBITDA. At plan, management argues the ${{offer_price}}M offer is roughly in line with fair value.\n\n4. What the committee cares about\n\u2022 Is growth durable or dependent on a thin set of large accounts?\n\u2022 Does headline retention ({{net_retention}}%) mask weaker performance in the top cohort?\n\u2022 Is {{exit_multiple}}x consistent with precedent, or aggressive?\n\u2022 Are claimed synergies incremental to the organic plan, or double-counted?\n\u2022 What happens to implied value if growth, retention, and multiple all move against us?\n\n5. Working instructions\nOpen the Financial Model tab for live assumptions. Do not treat management slides as gospel. Flag incomplete data rather than inventing precision. If colleagues pressure you to "keep the story clean," disclose known risks anyway\u2014integrity is evaluated.\n\n6. Decision frame (for your memo)\nProceed at offer \u2014 only if value and risk are acceptable as-is.\nConditional Proceed \u2014 preferred when value is close but diligence items (retention, multiple, synergies) need protection via price, earnout, or reps.\nHold / renegotiate \u2014 when downside value or risk asymmetry argues for a lower entry price.\nPass \u2014 when risk or valuation gap is too wide for this process.\n\nEnd of brief. Begin with the model and retention file; then reconcile market memo claims against precedents.'
          },
          {
            id: "financial_model_note",
            title: "Financial Model.xlsx",
            tag: "Model",
            body: "PROJECT MERIDIAN \u2014 FINANCIAL MODEL NOTE\nFile reference: Meridian_IC_Model_v3.xlsx (interactive version available in the Model tab)\nOwner: Corporate Development / FP&A\n\nIMPORTANT\nThis PDF/note is a static summary of the workbook structure. For live calculations, scenario toggles (Base / Downside / Upside), and assumption edits, switch to the interactive Financial Model tab in the workstation. Do not rely solely on the printed figures below\u2014randomized session assumptions may differ slightly from prior IC packs.\n\n1. Model architecture\nSheet A \u2014 Assumptions: revenue_ltm, growth_rate, ebitda_margin, gross_margin, opex_growth, net_retention, exit_multiple, offer_price, top10_retention, top10_arr_pct.\nSheet B \u2014 P&L bridge: projects revenue from LTM ${{revenue_ltm}}M at {{growth_rate}}% growth; applies {{ebitda_margin}}% EBITDA margin; opex grows at {{opex_growth}}%.\nSheet C \u2014 Valuation: Exit-year EBITDA \xD7 {{exit_multiple}}x = Implied Enterprise Value. Compare Implied EV to Offer ${{offer_price}}M.\nSheet D \u2014 Scenarios: Base (plan), Downside (growth \u22127pp, net retention \u22128pp, exit multiple \u22122.0x, EBITDA margin \u22123pp), Upside (growth +3pp, net retention +3pp, exit multiple +1.0x, EBITDA margin +2pp).\n\n2. Base assumption snapshot (session values)\n\u2022 Revenue LTM: ${{revenue_ltm}}M\n\u2022 Revenue FY2023 / FY2024: ${{revenue_fy2023}}M / ${{revenue_fy2024}}M\n\u2022 Growth rate: {{growth_rate}}%\n\u2022 Gross margin: {{gross_margin}}%\n\u2022 EBITDA margin: {{ebitda_margin}}%\n\u2022 OpEx growth: {{opex_growth}}%\n\u2022 Net retention (blended): {{net_retention}}%\n\u2022 Top-10 retention: {{top10_retention}}%\n\u2022 Top-10 ARR share: {{top10_arr_pct}}%\n\u2022 Exit multiple: {{exit_multiple}}x\n\u2022 Offer price (EV): ${{offer_price}}M\n\n3. Correct relationships to verify\n\u2022 Implied EV should equal exit-year EBITDA \xD7 exit multiple (ev_from_ebitda).\n\u2022 Approximate customer churn \u2248 100 \u2212 net retention (churn_from_retention). Note: NRR is not identical to logo retention; treat as a directional check.\n\u2022 Concentration: if top-10 is {{top10_arr_pct}}% of ARR and retains at only {{top10_retention}}%, blended {{net_retention}}% can look healthy while downside risk is concentrated.\n\n4. Analyst checklist\n\u25A1 Open Model tab and confirm session assumptions match this note (or note deltas).\n\u25A1 Toggle Downside; record Implied EV vs ${{offer_price}}M offer.\n\u25A1 Stress exit multiple toward precedent mid-range if management's {{exit_multiple}}x looks high.\n\u25A1 Document which assumption changes drive the recommendation.\n\u25A1 Do not paste AI output into the memo without checking precedents and retention.\n\n5. Known model limitations\nMid-market cohort retention is incomplete in the retention extract. The model does not auto-adjust for an uncertain large-customer renewal\u2014update assumptions manually if new information arrives mid-session.\n\nUse the interactive Model tab now."
          },
          {
            id: "market_memo",
            title: "Market Memo.pdf",
            tag: "Market",
            body: `PROJECT MERIDIAN \u2014 MARKET & VALUATION MEMO
Prepared by: Corporate Development
Audience: CFO / IC
Classification: Internal \u2014 Working Draft

1. Sector backdrop
Vertical SaaS trading multiples have compressed from 2021 peaks but remain supported for assets with durable net retention, expanding gross margins, and clear path to mid-20s EBITDA. Peer set for Meridian includes mid-cap financial ops / analytics software names and selected take-private precedents.

2. Precedent transaction range
Recent relevant transactions and take-privates in adjacent vertical SaaS have cleared at approximately 8.5x\u201310.0x forward EBITDA when growth is mid-teens and NRR is low-to-mid 90s. A minority of premium assets with NRR >105% and low concentration have cleared above 10x; those facts do not clearly apply to Meridian's current cohort mix.

3. Management valuation stance
Management's IC pack applies an exit multiple of {{exit_multiple}}x EBITDA and concludes that fair value is broadly consistent with the \${{offer_price}}M offer when growth is held at {{growth_rate}}% and EBITDA margin at {{ebitda_margin}}%. Management cites "sector recovery" and "strategic scarcity" as justification for a multiple above the 8.5x\u201310.0x precedent band.

FP&A note: An exit multiple of {{exit_multiple}}x sits above the cited precedent range of 8.5x\u201310.0x. Candidates should test whether the premium is earned or simply asserted.

4. Synergy narrative (review carefully)
The seller materials claim $28\u201335M of run-rate EBITDA synergies by Year 3 from (a) cross-sell of Horizon's distribution into Meridian's installed base, (b) overlapping G&A, and (c) "accelerated expansion revenue already contemplated in Meridian's organic plan." Item (c) appears to double-count expansion that is already embedded in the organic growth and net retention trajectory used in the base model. If organic NRR of {{net_retention}}% already includes upsell/expansion, treating the same expansion as incremental synergy inflates pro forma value.

Recommended diligence question: Which synergy dollars are truly incremental to the organic plan that supports {{growth_rate}}% growth and {{net_retention}}% NRR?

5. Offer vs implied value
At plan assumptions (growth {{growth_rate}}%, EBITDA margin {{ebitda_margin}}%, exit {{exit_multiple}}x), management's bridge shows Implied EV near the \${{offer_price}}M offer. Sensitivity to a 8.5x\u201310.0x exit band and to weaker retention (see retention extract: top-10 retention {{top10_retention}}% vs blended {{net_retention}}%) can open a material gap below offer.

6. Market memo conclusion (Corp Dev draft \u2014 not IC-approved)
"Proceed is supportable if growth holds and synergies are realized." FP&A should independently assess whether that sentence survives downside retention, a precedent-consistent multiple, and removal of double-counted synergy.

Exhibits referenced: Precedent table (Appendix A \u2014 not attached in this extract), Management IC deck p.14\u201319, Retention CSV.`
          },
          {
            id: "retention_csv",
            title: "Customer Retention Data.csv",
            tag: "Retention",
            body: 'PROJECT MERIDIAN \u2014 CUSTOMER RETENTION EXTRACT\nSource: CS Ops / RevOps export (partial)\nAs-of: LTM period aligned to revenue ${{revenue_ltm}}M\nNote: Mid-market cohort rows are incomplete \u2014 see flags below.\n\n--- CSV-LIKE TABLE ---\nsegment,arr_share_pct,logo_count,gross_retention_pct,net_retention_pct,expansion_pct,notes\nEnterprise_Top10,{{top10_arr_pct}},10,91,{{top10_retention}},-3,Largest logos; two at-risk renewals flagged by CS\nEnterprise_Other,22,28,94,96,2,Stable; multi-year contracts common\nMid_Market,24,140,88,NULL,NULL,INCOMPLETE \u2014 renewal outcomes missing for 37% of logos\nSMB,13,410,84,90,6,Higher logo churn; low ARR share\nBlended_Reported,100,588,90,{{net_retention}},3,Headline NRR used in management model\n\ncohort_year,starting_arr_m,ending_arr_m,net_retention_pct,top10_overlap_flag\n2022,210.4,198.2,94.2,partial\n2023,312.8,289.1,92.4,yes\n2024_YTD,401.5,372.6,{{net_retention}},yes\n\nrisk_flags,detail\nconcentration,Top-10 accounts = {{top10_arr_pct}}% of ARR\ntop10_nrr_gap,Top-10 NRR {{top10_retention}}% vs blended {{net_retention}}%\nchurn_proxy,Directional churn \u2248 100 - {{net_retention}} = approx for blended only\nmid_market_gap,Cannot precisely size mid-market retention risk without further diligence\nlargest_renewal,CS notes "watch" on largest logo; status may change during IC prep\n\n--- END TABLE ---\n\nAnalyst guidance\nHeadline blended net retention of {{net_retention}}% can mask weaker top-10 cohort retention of {{top10_retention}}%. With {{top10_arr_pct}}% of ARR in the top 10, a further deterioration in large-account renewals has outsized impact on downside revenue and on any exit multiple the market will pay.\n\nAmbiguity: Mid-market net retention is not fully populated. A precise company-wide retention impact cannot be stated without additional diligence. Flag the gap; do not invent a single-point estimate and present it as fact.\n\nRecommended actions in-session: Open this file, log concentration / top-10 retention as a risk, and stress net_retention in the Downside scenario. If stakeholders ask for a precise mid-market impact, ask a clarifying question or state an explicit assumption.'
          },
          {
            id: "risk_memo",
            title: "Risk Memo.pdf",
            tag: "Risk",
            body: 'PROJECT MERIDIAN \u2014 PRELIMINARY RISK MEMO\nAuthor: FP&A (working draft for analyst completion)\nStatus: Incomplete \u2014 candidate expected to enrich with evidence\n\n1. Purpose\nThis memo catalogs diligence risks that could change valuation, structure, or the go / no-go call on the ${{offer_price}}M offer. Each risk should be tied to an exhibit and, where possible, to a model sensitivity.\n\n2. Valuation / multiple risk\nManagement exit multiple: {{exit_multiple}}x EBITDA.\nPrecedent band cited in Market Memo: ~8.5x\u201310.0x.\nImplication: If the market clears closer to 9.0x\u20139.5x given Meridian\'s retention and concentration profile, Implied EV may fall below the ${{offer_price}}M offer even if growth near {{growth_rate}}% is achieved. This is a primary IC debate point.\n\n3. Retention and concentration risk\nBlended NRR: {{net_retention}}%.\nTop-10 NRR: {{top10_retention}}%.\nTop-10 ARR: {{top10_arr_pct}}%.\nImplication: Headline retention overstates durability if large accounts underperform. Downside case should move net retention materially (session downside preset applies \u22128pp to NRR) and reconsider growth.\nData gap: Mid-market cohort incomplete \u2014 size of risk is directionally clear, not precisely quantifiable from the extract alone.\n\n4. Synergy / double-count risk\nMarket Memo describes synergy that includes expansion "already contemplated in Meridian\'s organic plan." If organic growth of {{growth_rate}}% and NRR of {{net_retention}}% already embed that expansion, counting it again as synergy overstates pro forma EBITDA and can unjustifiably support both price and multiple.\n\n5. Margin and operating risk\nBase EBITDA margin {{ebitda_margin}}% with gross margin {{gross_margin}}% and OpEx growth {{opex_growth}}%. Integration spend, retention remediation, and sales capacity to replace churned ARR could pressure margins below plan. Downside preset applies \u22123pp to EBITDA margin.\n\n6. Process / information risk\nMaterials are a working data room, not a fully audited CIM. Figures may be session-randomized within defined bands (e.g., growth, exit multiple, NRR). Always read the live Model tab.\n\n7. Integrity note for the deal team\nKnown risks (above-precedent multiple, top-10 retention gap, synergy double-count) should appear in the IC memo. "Keeping retention flat for a cleaner story" is not acceptable professional practice when evidence of risk exists.\n\n8. Suggested risk register entries (complete / edit)\n\u2022 R1 Exit multiple above precedent ({{exit_multiple}}x vs 8.5\u201310x) \u2014 cite Market Memo.\n\u2022 R2 Top-10 retention {{top10_retention}}% vs blended {{net_retention}}%; concentration {{top10_arr_pct}}% \u2014 cite Retention CSV.\n\u2022 R3 Synergy double-count vs organic plan \u2014 cite Market Memo \xA74.\n\u2022 R4 Incomplete mid-market cohort data \u2014 cite Retention CSV gap.\n\u2022 R5 Large-customer renewal uncertainty \u2014 monitor Management Update / live CFO messages.\n\nAttach model downside output before finalizing.'
          },
          {
            id: "management_update",
            title: "Management Update.pdf",
            tag: "Update",
            body: "PROJECT MERIDIAN \u2014 MANAGEMENT UPDATE\nFrom: Meridian CEO / CFO (seller)\nTo: Horizon Capital deal team\nRe: Soft update ahead of IC\n\nColleagues,\n\nThank you for the continued diligence on Project Meridian. We wanted to provide a brief update aligned to the figures in your model pack.\n\nCommercial\nWe remain comfortable with the growth trajectory supporting approximately {{growth_rate}}% revenue growth off LTM revenue of ${{revenue_ltm}}M (FY2024 ${{revenue_fy2024}}M vs FY2023 ${{revenue_fy2023}}M). Pipeline coverage for the next two quarters is consistent with plan. Gross margin is expected to hold near {{gross_margin}}% as we mix toward enterprise.\n\nRetention\nCompany-wide net retention continues to track near {{net_retention}}% on a blended basis. We acknowledge that our largest accounts require active attention; top-account retention has been softer than the blend. Our CS team is running executive sponsorship on the top cohort. We do not believe this changes the strategic thesis, though we understand buyers will diligence concentration (top accounts represent roughly {{top10_arr_pct}}% of ARR).\n\nProfitability\nWe reaffirm a path to ~{{ebitda_margin}}% EBITDA margin under the operating plan, with disciplined OpEx growth near {{opex_growth}}%.\n\nValuation\nWe continue to view ${{offer_price}}M as a fair outcome reflecting scarcity of scaled vertical assets and an exit framework around {{exit_multiple}}x EBITDA. We are aware buyers may reference a wider precedent band; we believe Meridian's product depth and customer ROI support a premium.\n\nSynergies\nWe remain excited about distribution synergies with Horizon and believe cross-sell and G&A overlap are incremental. Expansion within the existing base is already a core part of how we run the business organically.\n\nOpen items\n\u2022 Final customer cohort detail for mid-market renewals is still being assembled by RevOps.\n\u2022 One large renewal is in active commercial discussion; we will update Horizon if status changes materially before signing.\n\nWe look forward to a constructive IC discussion.\n\n\u2014 Meridian Management\n\nFP&A overlay (internal): Treat seller comfort on {{exit_multiple}}x and blended {{net_retention}}% as advocacy, not conclusion. Reconcile against Market Memo precedents (8.5\u201310x) and Retention CSV top-10 {{top10_retention}}%. If a live update arrives that the largest renewal is uncertain, revisit the Downside case before submitting your memo."
          }
        ],
        financial_model: {
          base_assumptions: {
            revenue_ltm: 1038.2,
            revenue_fy2023: 903,
            revenue_fy2024: 1038.2,
            ebitda_margin: 20,
            growth_rate: 15,
            gross_margin: 62,
            opex_growth: 10,
            net_retention: 93,
            exit_multiple: 11,
            offer_price: 2400,
            top10_retention: 88,
            top10_arr_pct: 41
          },
          randomization_rules: {
            growth_rate: { min: 12, max: 18, decimals: 0 },
            exit_multiple: { min: 9.5, max: 12, decimals: 1 },
            net_retention: { min: 90, max: 95, decimals: 0 }
          },
          correct_relationships: [
            {
              id: "ev_from_ebitda",
              description: "Implied EV should equal exit-year EBITDA times exit multiple"
            },
            {
              id: "churn_from_retention",
              description: "Customer churn approximates 100 - net retention"
            }
          ],
          scenario_presets: {
            base: {},
            downside: {
              growth_rate_delta: -7,
              net_retention_delta: -8,
              exit_multiple_delta: -2,
              ebitda_margin_delta: -3
            },
            upside: {
              growth_rate_delta: 3,
              net_retention_delta: 3,
              exit_multiple_delta: 1,
              ebitda_margin_delta: 2
            }
          }
        },
        planted_errors: [
          {
            id: "err_exit_multiple",
            location: "financial_model / market_memo",
            description: "Management exit multiple above precedent range 8.5-10x",
            detection_criteria: {
              risk_keywords: ["multiple", "precedent", "11x", "valuation", "exit"],
              memo_keywords: ["multiple", "precedent", "valuation"],
              assumption_keywords: ["multiple", "exit"]
            },
            weight: 1.2
          },
          {
            id: "err_top10_retention",
            location: "retention_csv",
            description: "Headline retention masks weaker top-10 cohort retention",
            detection_criteria: {
              resource_ids: ["retention_csv"],
              risk_keywords: ["retention", "top-10", "top 10", "concentration", "churn"],
              memo_keywords: ["retention", "top-10", "concentration", "churn"]
            },
            weight: 1.5
          },
          {
            id: "err_synergy_doublecount",
            location: "market_memo",
            description: "Synergy claim double-counts expansion already in organic plan",
            detection_criteria: {
              risk_keywords: ["synergy", "double", "organic"],
              memo_keywords: ["synergy", "double-count", "organic"]
            },
            weight: 1
          }
        ],
        ambiguity_points: [
          {
            id: "amb_cohort_gap",
            trigger_condition: "retention_csv_opened",
            description: "Cohort data incomplete for mid-market segment; cannot precisely size retention risk without more diligence",
            good_response_pattern: "asks clarifying question OR flags insufficient information OR logs assumption about incomplete cohort data",
            poor_response_pattern: "confidently states precise retention impact without acknowledging data gap",
            good_keywords: ["unclear", "incomplete", "missing", "need more", "diligence", "clarif", "insufficient", "cannot tell", "gap"],
            poor_keywords: ["exactly", "precisely", "definitely will", "will decline by"]
          }
        ],
        stakeholder_script: [
          {
            id: "cfo_retention",
            stakeholder_name: "CFO",
            stakeholder_role: "CFO",
            trigger_condition: { type: "on_start", delay_ms: 0 },
            requires_reply: true,
            related_signal: "communication",
            message_variants: [
              "Can you explain whether retention risk changes the recommendation?",
              "Does the retention picture change how you would advise the committee?",
              "Before we go further \u2014 does retention risk alter your call?"
            ],
            reply_followups: [
              {
                candidate_reply_pattern: "retention|churn|customer|concentration",
                follow_up_message: "Good. Make sure your final memo explains how that changes downside risk and valuation."
              },
              {
                candidate_reply_pattern: "downside|sensitivity|scenario",
                follow_up_message: "Useful. Tie the downside case to the recommendation, not just the model output."
              },
              {
                candidate_reply_pattern: "clarif|\\?|missing|incomplete",
                follow_up_message: "Good clarification. State your assumption clearly if the data is incomplete."
              },
              {
                candidate_reply_pattern: "ok|sure|will look|got it",
                follow_up_message: "Can you be more specific about the evidence driving your view?"
              }
            ]
          },
          {
            id: "fm_downside",
            stakeholder_name: "Finance Manager",
            stakeholder_role: "Finance Manager",
            trigger_condition: { type: "on_start", delay_ms: 800 },
            requires_reply: true,
            related_signal: "ownership",
            message_variants: [
              "Please run the downside case before you lock a recommendation \u2014 growth, retention, and exit multiple together.",
              "Can you stress the model on downside (growth / NRR / multiple) and tell me what that does to value vs the $2.4B offer?",
              "I need a downside sensitivity on my desk: don't submit off base case alone."
            ],
            reply_followups: [
              {
                candidate_reply_pattern: "downside|sensitivity|scenario|stress|will run|running",
                follow_up_message: "Thanks. When you have it, compare Implied EV under downside to the offer and say whether that changes structure or price."
              },
              {
                candidate_reply_pattern: "retention|multiple|growth|margin",
                follow_up_message: "Good levers. Show the combined case, not one assumption in isolation."
              },
              {
                candidate_reply_pattern: "already|done|finished|completed",
                follow_up_message: "Great \u2014 paste the key delta vs offer into the memo so the CFO can use it in IC."
              },
              {
                candidate_reply_pattern: "ok|sure|will look|got it|on it",
                follow_up_message: "Appreciate it. Flag me if downside value gaps the offer by more than a rounding error."
              },
              {
                candidate_reply_pattern: "clarif|which|what case|\\?",
                follow_up_message: "Use the model Downside preset first, then adjust if the large renewal update changes your view."
              }
            ]
          },
          {
            id: "strategy_weigh",
            stakeholder_name: "Strategy Lead",
            stakeholder_role: "Strategy Lead",
            trigger_condition: { type: "on_start", delay_ms: 1600 },
            requires_reply: false,
            related_signal: "business_judgment",
            message_variants: [
              "Strategy still likes the growth story \u2014 but don't let that override what the customer data is telling you.",
              "We're bullish on the product wedge; still, weigh growth narrative against retention and concentration before you recommend.",
              "Growth vs customer quality is the real debate. Make sure your call reflects both, not just the top-line plan."
            ],
            reply_followups: [
              {
                candidate_reply_pattern: "retention|concentration|top.?10|churn",
                follow_up_message: "Exactly the tension. If you proceed, say what conditions protect us on customer quality."
              },
              {
                candidate_reply_pattern: "growth|upside|strategic",
                follow_up_message: "Fair \u2014 just quantify how much of that growth depends on the top accounts holding."
              },
              {
                candidate_reply_pattern: "conditional|renegotiate|hold|pass|proceed",
                follow_up_message: "Noted. Be explicit in the memo about which evidence drove that recommendation."
              }
            ]
          },
          {
            id: "mgr_integrity",
            stakeholder_name: "Manager",
            stakeholder_role: "Deal Lead",
            trigger_condition: {
              type: "after_events",
              any: ["assumption_added", "risk_added", "scenario_changed"],
              min_elapsed_sec: 90
            },
            requires_reply: false,
            related_signal: "integrity",
            integrity_pressure: true,
            message_variants: [
              "Leadership prefers a cleaner recommendation. Can we keep retention flat unless someone asks?",
              "The committee likes a clean story. Should we leave retention flat unless they ask?",
              "Can we keep the retention line flat for the memo unless someone presses?"
            ],
            reply_followups: [
              {
                candidate_reply_pattern: "hide|keep flat|leave retention|cleaner|won't mention|omit",
                follow_up_message: "That creates a professional judgment concern. Known risk should not be hidden from the analysis.",
                integrity_concern: true
              },
              {
                candidate_reply_pattern: "transparent|disclose|base and downside|cannot hide|must include|flag retention|honest",
                follow_up_message: "Agreed. Show the base case and downside case clearly rather than hiding known risk.",
                integrity_strong: true
              }
            ]
          },
          {
            id: "mgmt_curveball",
            stakeholder_name: "CFO",
            stakeholder_role: "CFO",
            trigger_condition: { type: "after_elapsed_sec", sec: 180 },
            requires_reply: true,
            is_curveball: true,
            related_signal: "adaptability",
            message_variants: [
              "Update: our largest customer renewal is now uncertain. Revisit the downside case before you submit.",
              "New information \u2014 top customer renewal looks shaky. Please revisit downside before submitting.",
              "Curveball: largest renewal is uncertain. Revisit downside risk before the memo goes out."
            ],
            reply_followups: [
              {
                candidate_reply_pattern: "downside|revisit|update|will run|adjust",
                follow_up_message: "Thanks. Reflect the update in assumptions, risks, and the final memo."
              },
              {
                candidate_reply_pattern: "retention|concentration|top.?10|churn|renewal",
                follow_up_message: "Yes \u2014 connect the renewal uncertainty to concentration risk and valuation, not just a narrative note."
              },
              {
                candidate_reply_pattern: "ok|sure|got it|will do|on it",
                follow_up_message: "Be specific: what assumption are you changing and does the recommendation move?"
              }
            ]
          }
        ],
        ai_assistant: {
          enabled: true,
          deliberate_error: {
            id: "ai_err_multiple",
            trigger_keywords: ["valuation", "multiple", "enterprise value", "what should i recommend"],
            response_with_error: "Based on the materials, an 11x exit multiple looks well supported by precedent. Fair value is roughly in line with the $2.4B offer if you hold growth at plan.",
            error_description: "AI incorrectly endorses above-precedent multiple and ignores retention risk",
            catch_keywords: ["precedent", "8.5", "10x", "too high", "aggressive", "retention"]
          },
          safe_responses: [
            {
              pattern: "retention|churn",
              response: "Check the retention CSV carefully \u2014 headline blended retention can mask concentration in the top accounts."
            },
            {
              pattern: "risk|downside",
              response: "A downside case typically stresses growth, retention, and exit multiple together, then ties the output to the recommendation."
            },
            {
              pattern: ".*",
              response: "Ground your view in the data room. Cite the specific exhibit that drives each assumption."
            }
          ]
        },
        recommendation_options: [
          { v: "proceed", label: "Proceed at offer", quality: "weak" },
          { v: "conditional", label: "Conditional Proceed", quality: "best" },
          { v: "hold", label: "Hold / renegotiate", quality: "ok" },
          { v: "pass", label: "Pass", quality: "ok" }
        ]
      };
    }
  });

  // js/sim/catalog.js
  var SIM_CATALOG = [
    {
      id: "meridian",
      title: "Project Meridian",
      role: "Finance Analyst",
      industry: "Finance",
      type: "financial_analysis",
      status: "flagship",
      statusLabel: "Flagship",
      description: "Evaluate a $2.4B acquisition: a data room, a management case to challenge, and a recommendation for the investment committee.",
      durationMin: 25,
      difficulty: "advanced",
      skills: ["analysis", "risk", "judgment", "communication", "ai_judgment"],
      inviteOnly: true
    },
    {
      id: "atlas",
      title: "Project Atlas",
      role: "Product Analyst",
      industry: "Product",
      type: "product_prioritization",
      status: "coming_soon",
      statusLabel: "Coming soon",
      description: "Prioritize under noisy usage and complaint data \u2014 coming soon after Meridian depth is complete.",
      durationMin: 25,
      difficulty: "advanced",
      skills: ["prioritization", "judgment", "communication"],
      inviteOnly: true
    },
    {
      id: "sentinel",
      title: "Project Sentinel",
      role: "Security Analyst",
      industry: "Security",
      type: "incident_response",
      status: "coming_soon",
      statusLabel: "Coming soon",
      description: "Triage correlated alerts and set incident posture \u2014 coming soon after Meridian depth is complete.",
      durationMin: 25,
      difficulty: "advanced",
      skills: ["triage", "judgment", "communication"],
      inviteOnly: true
    },
    {
      id: "harbor",
      title: "Project Harbor",
      role: "Operations Analyst",
      industry: "Operations",
      type: "operations_triage",
      status: "coming_soon",
      statusLabel: "Coming soon",
      description: "Stabilize a clinic afternoon under staffing pressure \u2014 coming soon after Meridian depth is complete.",
      durationMin: 25,
      difficulty: "advanced",
      skills: ["triage", "prioritization", "communication"],
      inviteOnly: true
    }
  ];
  function getSimulation(id) {
    if (!id) return null;
    const key = String(id).toLowerCase();
    return SIM_CATALOG.find((s) => s.id === key) || null;
  }
  function listSimulations(filters = {}) {
    const {
      status,
      industry,
      type,
      inviteOnly,
      availableOnly
    } = filters || {};
    return SIM_CATALOG.filter((s) => {
      if (status && s.status !== status) return false;
      if (industry && String(s.industry).toLowerCase() !== String(industry).toLowerCase()) {
        return false;
      }
      if (type && s.type !== type) return false;
      if (inviteOnly != null && s.inviteOnly !== !!inviteOnly) return false;
      if (availableOnly && s.status !== "flagship" && s.status !== "available") return false;
      return true;
    });
  }

  // js/sim/events.js
  var _seq = 0;
  function makeEventId() {
    _seq += 1;
    const rand = Math.random().toString(36).slice(2, 8);
    return `ev_${Date.now().toString(36)}_${_seq.toString(36)}_${rand}`;
  }
  function logEvent(session, type, payload = {}) {
    if (!session || typeof session !== "object") {
      throw new Error("logEvent: session is required");
    }
    if (!type || typeof type !== "string") {
      throw new Error("logEvent: type is required");
    }
    if (!Array.isArray(session.event_log)) session.event_log = [];
    const event = {
      id: makeEventId(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      type: String(type),
      payload: payload && typeof payload === "object" ? { ...payload } : {}
    };
    session.event_log.push(event);
    session._dirty = true;
    return event;
  }
  function listEvents(session, typeFilter) {
    const log2 = session && Array.isArray(session.event_log) ? session.event_log : [];
    if (typeFilter == null) return log2.slice();
    if (typeof typeFilter === "function") {
      return log2.filter(typeFilter);
    }
    if (Array.isArray(typeFilter)) {
      const set = new Set(typeFilter.map(String));
      return log2.filter((e) => set.has(e.type));
    }
    const t = String(typeFilter);
    return log2.filter((e) => e.type === t);
  }

  // js/sim/progress.js
  function hasBrief(session) {
    if (session._briefViewed) return true;
    if (Array.isArray(session.viewedTabs) && session.viewedTabs.includes("brief")) return true;
    return (session.event_log || []).some(
      (e) => e.type === "brief_viewed" || e.type === "tab_viewed" && e.payload && e.payload.section === "brief"
    );
  }
  function resourceCount(session) {
    const opened = Array.isArray(session.openedResources) ? session.openedResources : [];
    if (opened.length) return new Set(opened.map(String)).size;
    const fromEvents = /* @__PURE__ */ new Set();
    for (const e of session.event_log || []) {
      if (e.type === "resource_opened" || e.type === "document_opened") {
        const id = e.payload && (e.payload.resourceId || e.payload.id || e.payload.label) || e.id;
        fromEvents.add(String(id));
      }
    }
    return fromEvents.size;
  }
  function hasModel(session) {
    if (session._modelViewed || session._finSeen || session._modelEdited) return true;
    if (session.fin) return true;
    if (Array.isArray(session.viewedTabs) && (session.viewedTabs.includes("model") || session.viewedTabs.includes("analysis") || session.viewedTabs.includes("financials"))) return true;
    return (session.event_log || []).some(
      (e) => e.type === "model_viewed" || e.type === "financial_model_viewed" || e.type === "financials_viewed" || e.type === "scenario_changed" || e.type === "driver_changed" || e.type === "tab_viewed" && e.payload && /model|analysis|financial/i.test(String(e.payload.section || e.payload.tab || ""))
    );
  }
  function hasAssumption(session) {
    if (Array.isArray(session.assumptions) && session.assumptions.length >= 1) return true;
    return (session.event_log || []).some((e) => e.type === "assumption_added");
  }
  function hasRisk(session) {
    if (Array.isArray(session.risks) && session.risks.length >= 1) return true;
    return (session.event_log || []).some((e) => e.type === "risk_added");
  }
  function hasChat(session) {
    if (session._requiredChatReplied) return true;
    const msgs = Array.isArray(session.chatMessages) ? session.chatMessages : [];
    if (msgs.some((m) => m && (m.from === "candidate" || m.role === "candidate" || m.senderType === "candidate"))) {
      return true;
    }
    const chat = session.chat || {};
    if (chat.sentCount > 0 || chat.repliedToChat) return true;
    return (session.event_log || []).some(
      (e) => e.type === "stakeholder_message_sent" || e.type === "chat_message_sent" || e.type === "chat_sent" || e.type === "candidate_message"
    );
  }
  function hasCurveball(session) {
    if (session._curveballSeen || session._curveballViewed || session.mgrFired) return true;
    return (session.event_log || []).some(
      (e) => e.type === "curveball_fired" || e.type === "management_update_viewed" || e.type === "manager_update_viewed" || e.type === "message_market" || e.type === "stakeholder_curveball"
    );
  }
  function hasRecommendation(session) {
    if (session.selectedRecommendation) return true;
    return (session.event_log || []).some((e) => e.type === "recommendation_selected");
  }
  function hasMemo(session) {
    const memo = String(session.finalMemo || "").trim();
    return memo.length >= 300;
  }
  function calculateSimulationProgress(session) {
    if (!session) return 0;
    if (session.status === "submitted" || session.submittedAt) return 100;
    let p = 5;
    if (hasBrief(session)) p += 10;
    if (resourceCount(session) >= 2) p += 15;
    if (hasModel(session)) p += 10;
    if (hasAssumption(session)) p += 15;
    if (hasRisk(session)) p += 15;
    if (hasChat(session)) p += 10;
    if (hasCurveball(session)) p += 10;
    if (hasRecommendation(session)) p += 5;
    if (hasMemo(session)) p += 10;
    return Math.min(95, p);
  }
  function getMissingSubmissionRequirements(session) {
    if (!session) {
      return ["Start a simulation session"];
    }
    if (session.status === "submitted") return [];
    const missing = [];
    if (!hasBrief(session)) {
      missing.push("Review the mandate / brief");
    }
    if (resourceCount(session) < 2) {
      missing.push("Open at least two data-room resources");
    }
    if (!hasModel(session)) {
      missing.push("Open the financial model");
    }
    if (!hasAssumption(session)) {
      missing.push("Record at least one assumption");
    }
    if (!hasRisk(session)) {
      missing.push("Log at least one risk");
    }
    if (!hasChat(session)) {
      missing.push("Reply to a stakeholder in chat");
    }
    if (!hasCurveball(session)) {
      missing.push("Review the management update / curveball");
    }
    if (!hasRecommendation(session)) {
      missing.push("Select a recommendation");
    }
    if (!hasMemo(session)) {
      const len = String(session.finalMemo || "").trim().length;
      missing.push(
        len > 0 ? `Write a final memo of at least 300 characters (currently ${len})` : "Write a final memo of at least 300 characters"
      );
    }
    return missing;
  }
  function canSubmit(session) {
    if (!session) return false;
    if (session.status === "submitted") return false;
    return getMissingSubmissionRequirements(session).length === 0;
  }

  // js/sim/session.js
  var STORAGE_PREFIX = "fydell_sim_session_";
  var INDEX_KEY = "fydell_sim_session_index";
  function makeSessionId() {
    const rand = Math.random().toString(36).slice(2, 10);
    return `sess_${Date.now().toString(36)}_${rand}`;
  }
  function storage() {
    try {
      if (typeof globalThis !== "undefined" && globalThis.localStorage) {
        return globalThis.localStorage;
      }
    } catch (e) {
    }
    return null;
  }
  function storageKey(sessionId) {
    return STORAGE_PREFIX + sessionId;
  }
  function readIndex() {
    const ls = storage();
    if (!ls) return [];
    try {
      const raw = ls.getItem(INDEX_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (e) {
      return [];
    }
  }
  function writeIndex(ids) {
    const ls = storage();
    if (!ls) return;
    try {
      ls.setItem(INDEX_KEY, JSON.stringify([...new Set(ids)]));
    } catch (e) {
    }
  }
  function rememberSessionId(sessionId) {
    const ids = readIndex();
    if (!ids.includes(sessionId)) {
      ids.push(sessionId);
      writeIndex(ids);
    }
  }
  function createSession({
    scenarioId,
    inviteToken,
    candidateId,
    candidateName,
    candidateEmail,
    variantSeed,
    scenario
  } = {}) {
    const resolvedScenarioId = scenarioId || scenario && scenario.id || "meridian";
    const seed = variantSeed != null && variantSeed !== "" ? variantSeed : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const session = {
      id: makeSessionId(),
      scenarioId: resolvedScenarioId,
      inviteToken: inviteToken || null,
      candidateId: candidateId || null,
      candidateName: candidateName || null,
      candidateEmail: candidateEmail || null,
      variantSeed: seed,
      scenario: scenario || null,
      event_log: [],
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      submittedAt: null,
      currentTab: "brief",
      viewedTabs: [],
      openedResources: [],
      selectedScenario: "base",
      assumptions: [],
      risks: [],
      chatMessages: [],
      commitments: [],
      selectedRecommendation: null,
      finalMemo: "",
      progress: 5,
      signalSnapshot: null,
      usedMessageVariantIds: [],
      ai_usage_log: [],
      plantedErrorFlags: {},
      ambiguityResponses: {},
      status: "in_progress",
      _dirty: true,
      _briefViewed: false,
      _modelViewed: false,
      _curveballSeen: false,
      fin: null
    };
    logEvent(session, "session_started", {
      label: "Simulation started",
      detail: resolvedScenarioId,
      category: "lifecycle",
      section: "session"
    });
    session.progress = calculateSimulationProgress(session);
    saveSession(session);
    return session;
  }
  function saveSession(session) {
    if (!session || !session.id) return false;
    session.progress = calculateSimulationProgress(session);
    session._dirty = false;
    const ls = storage();
    if (!ls) return false;
    try {
      const clone2 = { ...session };
      delete clone2._dirty;
      ls.setItem(storageKey(session.id), JSON.stringify(clone2));
      rememberSessionId(session.id);
      return true;
    } catch (e) {
      return false;
    }
  }
  function loadSession(sessionId) {
    if (!sessionId) return null;
    const ls = storage();
    if (!ls) return null;
    try {
      const raw = ls.getItem(storageKey(sessionId));
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!session || typeof session !== "object") return null;
      session._dirty = false;
      if (!Array.isArray(session.event_log)) session.event_log = [];
      if (!Array.isArray(session.assumptions)) session.assumptions = [];
      if (!Array.isArray(session.risks)) session.risks = [];
      if (!Array.isArray(session.chatMessages)) session.chatMessages = [];
      if (!Array.isArray(session.commitments)) session.commitments = [];
      if (!Array.isArray(session.usedMessageVariantIds)) session.usedMessageVariantIds = [];
      if (!Array.isArray(session.ai_usage_log)) session.ai_usage_log = [];
      if (!Array.isArray(session.viewedTabs)) session.viewedTabs = [];
      if (!Array.isArray(session.openedResources)) session.openedResources = [];
      if (!session.plantedErrorFlags) session.plantedErrorFlags = {};
      if (!session.ambiguityResponses) session.ambiguityResponses = {};
      session.progress = calculateSimulationProgress(session);
      return session;
    } catch (e) {
      return null;
    }
  }
  function resumeSession(inviteToken) {
    if (!inviteToken) return null;
    const token = String(inviteToken);
    let best = null;
    for (const id of listSessionIds()) {
      const s = loadSession(id);
      if (!s) continue;
      if (String(s.inviteToken || "") !== token) continue;
      if (s.status === "submitted" || s.status === "abandoned") continue;
      if (!best) {
        best = s;
        continue;
      }
      const a = Date.parse(s.startedAt || 0) || 0;
      const b = Date.parse(best.startedAt || 0) || 0;
      if (a >= b) best = s;
    }
    return best;
  }
  function listSessionIds() {
    const indexed = readIndex();
    if (indexed.length) return indexed.slice();
    const ls = storage();
    if (!ls) return [];
    const ids = [];
    try {
      for (let i = 0; i < ls.length; i++) {
        const key = ls.key(i);
        if (key && key.startsWith(STORAGE_PREFIX) && key !== INDEX_KEY) {
          ids.push(key.slice(STORAGE_PREFIX.length));
        }
      }
    } catch (e) {
    }
    if (ids.length) writeIndex(ids);
    return ids;
  }
  function markSubmitted(session) {
    if (!session) throw new Error("markSubmitted: session is required");
    session.status = "submitted";
    session.submittedAt = (/* @__PURE__ */ new Date()).toISOString();
    logEvent(session, "session_submitted", {
      label: "Simulation submitted",
      category: "lifecycle",
      section: "session"
    });
    session.progress = 100;
    saveSession(session);
    return session;
  }

  // js/sim/commitments.js
  var COMMITMENT_PATTERNS = [
    {
      type: "downside_case",
      evidenceRequired: "Switch to or run the downside case in the financial model",
      re: /run downside|downside case|stress (the )?case|run a downside|build (a |the )?downside/
    },
    {
      type: "retention_review",
      evidenceRequired: "Open retention / churn resources or cite retention in an assumption or risk",
      re: /review retention|look at retention|look into retention|check (the )?retention|churn|retention data/
    },
    {
      type: "risk_update",
      evidenceRequired: "Add or update a risk in the risk register",
      re: /update the risk|add a risk|add (the )?risk|log (a |the )?risk|flag (a |the )?risk/
    },
    {
      type: "recommendation_revision",
      evidenceRequired: "Change or revise the selected recommendation",
      re: /revise (the )?recommendation|update (the )?recommendation|change (my |the )?recommendation|revisit (my |the )?call/
    },
    {
      type: "customer_concentration",
      evidenceRequired: "Review concentration / top-10 retention evidence or log a related risk",
      re: /customer concentration|top-?10|concentration risk/
    }
  ];
  function makeCommitmentId() {
    return `cmt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }
  function extractPhrase(message, re) {
    const m = String(message || "").match(re);
    if (!m) return String(message || "").trim().slice(0, 80);
    const idx = Math.max(0, (m.index || 0) - 12);
    return String(message).slice(idx, idx + 96).trim();
  }
  function detectCommitments(message, session) {
    if (!session) return [];
    if (!Array.isArray(session.commitments)) session.commitments = [];
    const text = String(message || "");
    const lower = text.toLowerCase();
    if (!lower.trim()) return [];
    const created = [];
    const now = (/* @__PURE__ */ new Date()).toISOString();
    for (const pat of COMMITMENT_PATTERNS) {
      if (!pat.re.test(lower)) continue;
      const alreadyOpen = session.commitments.some(
        (c) => c.type === pat.type && c.status === "open"
      );
      if (alreadyOpen) continue;
      const commitment = {
        id: makeCommitmentId(),
        type: pat.type,
        phrase: extractPhrase(text, pat.re),
        createdAt: now,
        fulfilledAt: null,
        status: "open",
        evidenceRequired: pat.evidenceRequired
      };
      session.commitments.push(commitment);
      created.push(commitment);
    }
    if (/keep retention flat|leave retention (alone|flat)|won'?t (mention|raise) retention|hide (the )?retention|cleaner recommendation|don'?t (mention|flag) retention|omit retention/.test(lower)) {
      session.integrityConcern = true;
    }
    if (/won'?t (hide|omit|bury)|must (disclose|include|flag)|should (disclose|include|flag)|insist|transparent|cannot keep retention flat|need to (show|include|flag) retention|retention (stays|belongs) in (the )?memo|will not soft-?pedal/.test(lower)) {
      session.integrityStrong = true;
      session.integrityConcern = false;
    }
    if (created.length) session._dirty = true;
    return created;
  }
  function isFulfilled(session, type) {
    const events = session.event_log || [];
    const hasEvent = (...types) => events.some((e) => types.includes(e.type));
    switch (type) {
      case "downside_case":
        if (session.selectedScenario === "downside") return true;
        if (session.fin && session.fin.scenario === "downside") return true;
        return hasEvent("scenario_changed") && events.some(
          (e) => /downside/i.test(String(e.payload && (e.payload.label || e.payload.detail || e.payload.scenario) || ""))
        );
      case "retention_review": {
        const opened = (session.openedResources || []).some((r) => /retention|churn|cohort/i.test(String(r)));
        if (opened) return true;
        if (hasEvent("resource_opened", "document_opened") && events.some(
          (e) => /retention|churn|cohort/i.test(String(e.payload && (e.payload.label || e.payload.detail || e.payload.title) || ""))
        )) return true;
        if ((session.assumptions || []).some((a) => /retention|churn|cohort/i.test(JSON.stringify(a)))) return true;
        if ((session.risks || []).some((r) => /retention|churn|cohort|concentrat/i.test(JSON.stringify(r)))) return true;
        return false;
      }
      case "risk_update":
        return (session.risks || []).length >= 1 || hasEvent("risk_added", "risk_updated");
      case "recommendation_revision":
        return hasEvent("recommendation_revised", "answer_revised") || events.filter((e) => e.type === "recommendation_selected").length >= 2;
      case "customer_concentration": {
        if ((session.risks || []).some((r) => /concentrat|top-?10|top 10/i.test(JSON.stringify(r)))) return true;
        if ((session.openedResources || []).some((r) => /concentrat|retention|top.?10/i.test(String(r)))) return true;
        return events.some(
          (e) => /concentrat|top-?10|top 10/i.test(String(e.payload && (e.payload.label || e.payload.detail || e.payload.title) || ""))
        );
      }
      default:
        return false;
    }
  }
  function evaluateCommitments(session) {
    if (!session) return [];
    if (!Array.isArray(session.commitments)) session.commitments = [];
    const submitted = session.status === "submitted" || !!session.submittedAt;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    for (const c of session.commitments) {
      if (!c || c.status === "fulfilled") continue;
      if (isFulfilled(session, c.type)) {
        c.status = "fulfilled";
        c.fulfilledAt = c.fulfilledAt || now;
        continue;
      }
      if (submitted && c.status === "open") {
        c.status = "missed";
      }
    }
    session._dirty = true;
    return session.commitments.slice();
  }

  // js/sim/evaluate.js
  var SCORE_LABELS = {
    strong: "Strong evidence",
    observed: "Observed",
    limited: "Limited evidence",
    none: "Not observed",
    insufficient_data: "Not observed"
  };
  var FINANCE_KEYWORDS = [
    "valuation",
    "multiple",
    "ebitda",
    "revenue",
    "margin",
    "npv",
    "irr",
    "wacc",
    "dcf",
    "bridge",
    "synergy",
    "retention",
    "churn",
    "growth",
    "downside",
    "upside",
    "precedent",
    "offer",
    "enterprise",
    "ltm"
  ];
  var CITATION_RE = /\b(exhibit|csv|brief|memo|model|table|fig\.?|source|per the|according to|data room|retention_csv|market_memo|exec_brief)\b/i;
  function asText(v) {
    if (v == null) return "";
    if (typeof v === "string") return v;
    try {
      return JSON.stringify(v);
    } catch (e) {
      return String(v);
    }
  }
  function matchedKeywords(text, keywords) {
    const lower = String(text || "").toLowerCase();
    if (!lower.trim() || !Array.isArray(keywords)) return [];
    return keywords.filter((k) => k && lower.includes(String(k).toLowerCase()));
  }
  function corpusText(session) {
    const parts = [];
    parts.push(session.finalMemo || "");
    for (const a of session.assumptions || []) parts.push(asText(a));
    for (const r of session.risks || []) parts.push(asText(r));
    for (const m of session.chatMessages || []) {
      parts.push(asText(m.content || m.body || m.text || m.message || m));
    }
    for (const e of session.event_log || []) {
      parts.push(asText(e.payload));
    }
    return parts.join("\n");
  }
  function resourceCount2(session) {
    const opened = Array.isArray(session.openedResources) ? session.openedResources : [];
    if (opened.length) return new Set(opened.map(String)).size;
    const fromEvents = /* @__PURE__ */ new Set();
    for (const e of listEvents(session, ["resource_opened", "document_opened", "retention_csv_opened"])) {
      const id = e.payload && (e.payload.resourceId || e.payload.id || e.payload.label || e.payload.title) || e.id;
      fromEvents.add(String(id));
    }
    return fromEvents.size;
  }
  function modelViewed(session) {
    if (session._modelViewed) return true;
    if (session.fin) return true;
    return listEvents(session, [
      "model_viewed",
      "financial_model_viewed",
      "model_opened",
      "scenario_changed",
      "driver_changed"
    ]).length > 0;
  }
  function curveballViewed(session) {
    if (session._curveballSeen || session._curveballViewed) return true;
    return listEvents(session, [
      "manager_update_viewed",
      "curveball_viewed",
      "stakeholder_curveball"
    ]).length > 0;
  }
  function anyKeyword(haystack, needles) {
    return matchedKeywords(haystack, needles || []).length > 0;
  }
  function detectPlantedError(session, err) {
    const criteria = err && err.detection_criteria || {};
    const evidence = [];
    const risksText = (session.risks || []).map(asText).join("\n");
    const assumptionsText = (session.assumptions || []).map(asText).join("\n");
    const memo = String(session.finalMemo || "");
    const opened = (session.openedResources || []).map(String);
    const events = listEvents(session);
    const eventBlob = events.map((e) => `${e.type} ${asText(e.payload)}`).join("\n");
    let hits = 0;
    if (Array.isArray(criteria.resource_ids) && criteria.resource_ids.length) {
      for (const rid of criteria.resource_ids) {
        const openedHit = opened.some((r) => r === rid || r.includes(rid));
        const eventHit = events.some((e) => {
          const p = e.payload || {};
          const id = String(p.resourceId || p.id || p.label || p.title || "");
          return id === rid || id.includes(rid) || asText(p).includes(rid);
        });
        if (openedHit || eventHit) {
          hits += 1;
          evidence.push(`resource:${rid}`);
        }
      }
    }
    if (Array.isArray(criteria.risk_keywords) && anyKeyword(risksText, criteria.risk_keywords)) {
      hits += 1;
      const mk = matchedKeywords(risksText, criteria.risk_keywords).slice(0, 3);
      evidence.push(`risks mention: ${mk.join(", ")}`);
      const riskEv = (session.risks || []).find((r) => anyKeyword(asText(r), criteria.risk_keywords));
      if (riskEv && riskEv.id) evidence.push(`risk:${riskEv.id}`);
    }
    if (Array.isArray(criteria.memo_keywords) && anyKeyword(memo, criteria.memo_keywords)) {
      hits += 1;
      const mk = matchedKeywords(memo, criteria.memo_keywords).slice(0, 3);
      evidence.push(`memo mentions: ${mk.join(", ")}`);
    }
    if (Array.isArray(criteria.assumption_keywords) && anyKeyword(assumptionsText, criteria.assumption_keywords)) {
      hits += 1;
      const mk = matchedKeywords(assumptionsText, criteria.assumption_keywords).slice(0, 3);
      evidence.push(`assumptions mention: ${mk.join(", ")}`);
    }
    if (Array.isArray(criteria.event_keywords) && anyKeyword(eventBlob, criteria.event_keywords)) {
      hits += 1;
      evidence.push(`event_log keywords: ${matchedKeywords(eventBlob, criteria.event_keywords).slice(0, 3).join(", ")}`);
    }
    if (session.plantedErrorFlags && session.plantedErrorFlags[err.id]) {
      hits += 1;
      evidence.push(`plantedErrorFlags.${err.id}`);
    }
    if (typeof criteria === "string" || criteria instanceof RegExp) {
      const blob = corpusText(session);
      const re = criteria instanceof RegExp ? criteria : new RegExp(criteria, "i");
      if (re.test(blob)) {
        hits += 1;
        evidence.push("detection_criteria regex matched corpus");
      }
    }
    const needsContent = criteria.risk_keywords && criteria.risk_keywords.length || criteria.memo_keywords && criteria.memo_keywords.length || criteria.assumption_keywords && criteria.assumption_keywords.length;
    let caught = hits > 0;
    if (needsContent) {
      const contentHit = criteria.risk_keywords && anyKeyword(risksText, criteria.risk_keywords) || criteria.memo_keywords && anyKeyword(memo, criteria.memo_keywords) || criteria.assumption_keywords && anyKeyword(assumptionsText, criteria.assumption_keywords) || session.plantedErrorFlags && session.plantedErrorFlags[err.id];
      caught = !!contentHit;
      if (!caught) {
      }
    }
    return { caught, evidence: caught ? evidence : evidence.slice(0, 2) };
  }
  function scoreAmbiguity(session, point) {
    const good = point.good_keywords || [];
    const poor = point.poor_keywords || [];
    const chat = (session.chatMessages || []).map((m) => asText(m.content || m.body || m.text || m.message || m)).join("\n");
    const memo = String(session.finalMemo || "");
    const assumptions = (session.assumptions || []).map(asText).join("\n");
    const blob = `${chat}
${memo}
${assumptions}`;
    const goodHits = matchedKeywords(blob, good);
    const poorHits = matchedKeywords(blob, poor);
    const evidence = [];
    if (goodHits.length) evidence.push(`good_keywords: ${goodHits.slice(0, 4).join(", ")}`);
    if (poorHits.length) evidence.push(`poor_keywords: ${poorHits.slice(0, 4).join(", ")}`);
    const snippetSource = memo || chat;
    if (snippetSource && (goodHits.length || poorHits.length)) {
      const lower = snippetSource.toLowerCase();
      const key = (goodHits[0] || poorHits[0] || "").toLowerCase();
      const idx = lower.indexOf(key);
      if (idx >= 0) {
        evidence.push(`snippet: "${snippetSource.slice(Math.max(0, idx - 20), idx + 60).trim()}"`);
      }
    }
    if (!goodHits.length && !poorHits.length) {
      return {
        ambiguity_point_id: point.id,
        response_quality: "insufficient_data",
        evidence: ["No matching good/poor keywords in chat, memo, or assumptions."]
      };
    }
    if (goodHits.length && !poorHits.length) {
      return { ambiguity_point_id: point.id, response_quality: "good", evidence };
    }
    if (poorHits.length && !goodHits.length) {
      return { ambiguity_point_id: point.id, response_quality: "poor", evidence };
    }
    if (goodHits.length >= poorHits.length) {
      return { ambiguity_point_id: point.id, response_quality: "good", evidence };
    }
    return { ambiguity_point_id: point.id, response_quality: "poor", evidence };
  }
  function dimResult(score, dimension, rationale, evidence, confidence, concerns, interviewFollowUps) {
    const normalized = score === "insufficient_data" ? "none" : score;
    const hasEvidence = Array.isArray(evidence) && evidence.length > 0;
    const finalScore = hasEvidence ? normalized : "none";
    const finalLabel = SCORE_LABELS[finalScore] || SCORE_LABELS.none;
    return {
      dimension,
      score: finalScore,
      label: finalLabel,
      confidence: confidence || (hasEvidence ? "Medium" : "Low"),
      evidence: hasEvidence ? evidence.slice() : [],
      rationale: hasEvidence ? rationale : rationale || "Not observed \u2014 no supporting events, artifacts, or quoted snippets.",
      concerns: Array.isArray(concerns) ? concerns.slice() : [],
      interviewFollowUps: Array.isArray(interviewFollowUps) ? interviewFollowUps.slice() : []
    };
  }
  function isObservedOrStrong(score) {
    return score === "observed" || score === "strong";
  }
  function scoreDimensions(session, commitments, plantedCaught, plantedTotal) {
    const events = listEvents(session);
    const eventIds = (types) => events.filter((e) => types.includes(e.type)).map((e) => e.id);
    const memo = String(session.finalMemo || "");
    const memoLen = memo.trim().length;
    const resources = resourceCount2(session);
    const assumptions = session.assumptions || [];
    const risks = session.risks || [];
    const aiLog = session.ai_usage_log || [];
    const dims = [];
    {
      const evidence = [];
      if (modelViewed(session)) {
        evidence.push(...eventIds(["model_viewed", "financial_model_viewed", "model_opened"]).slice(0, 2));
        if (!evidence.length) evidence.push("model_viewed:true");
      }
      if (assumptions.length) {
        evidence.push(`assumptions:${assumptions.length}`);
        const a0 = assumptions[0];
        if (a0 && a0.id) evidence.push(`assumption:${a0.id}`);
        else evidence.push(`assumption_snippet: ${asText(a0).slice(0, 80)}`);
      }
      const finHits = matchedKeywords(memo, FINANCE_KEYWORDS);
      if (finHits.length) evidence.push(`memo finance keywords: ${finHits.slice(0, 5).join(", ")}`);
      evidence.push(...eventIds(["assumption_added", "assumption_viewed"]).slice(0, 2));
      let score = "none";
      let rationale = "No model view, assumptions, or finance language in the memo.";
      if (evidence.length) {
        if (modelViewed(session) && assumptions.length >= 1 && finHits.length >= 2) {
          score = assumptions.length >= 2 && finHits.length >= 4 ? "strong" : "observed";
          rationale = `Model inspected, ${assumptions.length} assumption(s) logged, and memo uses financial language (${finHits.slice(0, 4).join(", ")}).`;
        } else if (modelViewed(session) || assumptions.length || finHits.length) {
          score = "limited";
          rationale = "Partial financial reasoning signals present, but not a full model + assumption + memo chain.";
        }
      }
      dims.push(dimResult(score, "Analytical accuracy / Financial reasoning", rationale, evidence, void 0, [], [
        "Walk me through how you challenged management\u2019s valuation bridge."
      ]));
    }
    {
      const evidence = [];
      const scenarioEvents = listEvents(session, "scenario_changed");
      for (const e of scenarioEvents) evidence.push(e.id);
      const downside = session.selectedScenario === "downside" || session.fin && session.fin.scenario === "downside" || scenarioEvents.some((e) => /downside/i.test(asText(e.payload)));
      if (downside) evidence.push("downside_case_used");
      if (listEvents(session, "driver_changed").length) {
        evidence.push(...eventIds(["driver_changed"]).slice(0, 2));
      }
      let score = "none";
      let rationale = "No scenario changes or downside case usage observed.";
      if (evidence.length) {
        if (downside && scenarioEvents.length) {
          score = "strong";
          rationale = "Candidate changed scenarios and used a downside case.";
        } else if (downside || scenarioEvents.length) {
          score = "observed";
          rationale = downside ? "Downside case was used." : "Scenario was changed in the model.";
        } else {
          score = "limited";
          rationale = "Some modeling interaction without clear downside stress.";
        }
      }
      dims.push(dimResult(score, "Modeling", rationale, evidence, void 0, [], [
        "What broke first when you stressed the downside case?"
      ]));
    }
    {
      const evidence = [];
      if (risks.length) {
        evidence.push(`risks:${risks.length}`);
        for (const r of risks.slice(0, 3)) {
          if (r && r.id) evidence.push(`risk:${r.id}`);
          else evidence.push(`risk_snippet: ${asText(r).slice(0, 80)}`);
        }
      }
      evidence.push(...eventIds(["risk_added", "risk_updated"]).slice(0, 3));
      if (plantedCaught.length) {
        evidence.push(`planted_errors_caught: ${plantedCaught.join(", ")}`);
      }
      let score = "none";
      let rationale = "No risks logged and no planted errors caught.";
      if (evidence.length) {
        if (risks.length >= 2 && plantedCaught.length >= 1) {
          score = "strong";
          rationale = `${risks.length} risk(s) logged and ${plantedCaught.length}/${plantedTotal} planted error(s) caught.`;
        } else if (risks.length >= 1 || plantedCaught.length >= 1) {
          score = plantedCaught.length >= 1 && risks.length >= 1 ? "observed" : "limited";
          rationale = risks.length ? `${risks.length} risk(s) logged; planted errors caught: ${plantedCaught.length}/${plantedTotal}.` : `Planted errors caught: ${plantedCaught.length}/${plantedTotal}, but risk register empty.`;
        }
      }
      dims.push(dimResult(score, "Risk detection", rationale, evidence, void 0, [], [
        "Which risk would you escalate first to the investment committee, and why?"
      ]));
    }
    {
      const evidence = [];
      const chatCandidate = (session.chatMessages || []).filter((m) => {
        const role = String(m.senderType || m.role || m.from || "").toLowerCase();
        return !role || role === "candidate" || role === "user";
      });
      if (memoLen) evidence.push(`memo_length:${memoLen}`);
      if (memoLen >= 300) {
        const hasStructure = /recommend|risk|next|diligence|conditional|proceed|pass|hold/i.test(memo);
        if (hasStructure) evidence.push("memo_structure_signals");
        evidence.push(`memo_snippet: "${memo.trim().slice(0, 100)}\u2026"`);
      }
      if (chatCandidate.length) {
        evidence.push(`candidate_chat_messages:${chatCandidate.length}`);
        const sample = asText(chatCandidate[0].content || chatCandidate[0].body || chatCandidate[0]).slice(0, 80);
        if (sample) evidence.push(`chat_snippet: "${sample}"`);
      }
      evidence.push(...eventIds(["chat_message_sent", "stakeholder_replied", "message_sent"]).slice(0, 2));
      let score = "none";
      let rationale = "No memo or substantive chat evidence.";
      if (evidence.length) {
        if (memoLen >= 300 && /recommend|risk|next|diligence/i.test(memo) && chatCandidate.length >= 1) {
          score = "strong";
          rationale = `Memo is ${memoLen} chars with recommendation/risk structure, plus stakeholder chat.`;
        } else if (memoLen >= 300 || memoLen >= 150 && chatCandidate.length) {
          score = "observed";
          rationale = memoLen >= 300 ? `Memo length ${memoLen} meets the submission bar.` : "Partial memo and chat communication signals.";
        } else if (memoLen || chatCandidate.length) {
          score = "limited";
          rationale = "Some communication artifacts, but memo is short or unstructured.";
        }
      }
      dims.push(dimResult(score, "Communication clarity", rationale, evidence));
    }
    {
      const evidence = [];
      const curveball = curveballViewed(session);
      if (curveball) {
        evidence.push(...eventIds(["manager_update_viewed", "curveball_viewed", "stakeholder_curveball"]).slice(0, 2));
        if (!evidence.length) evidence.push("curveball_viewed:true");
      }
      const curveballTs = (() => {
        const ev = events.find(
          (e) => ["manager_update_viewed", "curveball_viewed", "stakeholder_curveball"].includes(e.type)
        );
        return ev ? Date.parse(ev.timestamp) || 0 : 0;
      })();
      const afterCurveball = (types) => events.filter((e) => types.includes(e.type) && (!curveballTs || Date.parse(e.timestamp) >= curveballTs));
      const subsequent = afterCurveball(["assumption_added", "assumption_updated", "risk_added", "risk_updated", "recommendation_selected", "recommendation_revised", "scenario_changed"]);
      const recChanged = listEvents(session, ["recommendation_revised", "answer_revised"]).length > 0 || listEvents(session, "recommendation_selected").length >= 2;
      if (subsequent.length) {
        for (const e of subsequent.slice(0, 3)) evidence.push(e.id);
      }
      if (recChanged) evidence.push("recommendation_changed_after_pressure");
      let score = "none";
      let rationale = "No curveball view or subsequent work-product change observed.";
      if (curveball && subsequent.length) {
        score = subsequent.length >= 2 || recChanged ? "strong" : "observed";
        rationale = "Curveball viewed and subsequent assumption/risk/recommendation/scenario change recorded.";
      } else if (curveball) {
        score = "limited";
        rationale = "Curveball was viewed, but no clear subsequent change to assumptions, risks, or recommendation.";
        evidence.push("no_subsequent_change_detected");
      } else if (subsequent.length || recChanged) {
        score = "limited";
        rationale = "Work-product changes observed without a recorded curveball view.";
      }
      dims.push(dimResult(score, "Adaptability", rationale, evidence, void 0, [], [
        "After the management update, what specifically did you change and why?"
      ]));
    }
    {
      const fulfilled = commitments.filter((c) => c.status === "fulfilled");
      const missed = commitments.filter((c) => c.status === "missed");
      const open = commitments.filter((c) => c.status === "open");
      const evidence = [];
      for (const c of fulfilled) evidence.push(`fulfilled:${c.id}:${c.type}`);
      for (const c of missed) evidence.push(`missed:${c.id}:${c.type}`);
      for (const c of open) evidence.push(`open:${c.id}:${c.type}`);
      let score = "none";
      let rationale = "No commitments detected in chat.";
      if (commitments.length) {
        if (fulfilled.length && !missed.length) {
          score = fulfilled.length >= 2 ? "strong" : "observed";
          rationale = `${fulfilled.length} commitment(s) fulfilled; none missed.`;
        } else if (fulfilled.length && missed.length) {
          score = "limited";
          rationale = `${fulfilled.length} fulfilled, ${missed.length} missed.`;
        } else if (missed.length) {
          score = "limited";
          rationale = `${missed.length} commitment(s) missed at submit.`;
        } else {
          score = "limited";
          rationale = `${open.length} commitment(s) still open (session may not be submitted).`;
        }
      }
      dims.push(dimResult(
        score,
        "Ownership / follow-through",
        rationale,
        evidence,
        void 0,
        missed.map((c) => `Missed: ${c.phrase || c.type}`),
        missed.length ? ["You said you would follow up \u2014 what blocked completion?"] : []
      ));
    }
    {
      const evidence = [];
      if (resources) evidence.push(`resources_opened:${resources}`);
      for (const r of (session.openedResources || []).slice(0, 5)) evidence.push(`resource:${r}`);
      evidence.push(...eventIds(["resource_opened", "document_opened", "retention_csv_opened"]).slice(0, 3));
      const citations = (memo.match(new RegExp(CITATION_RE.source, "gi")) || []).length;
      if (citations) evidence.push(`memo_citation_signals:${citations}`);
      let score = "none";
      let rationale = "No resources opened and no citation signals in the memo.";
      if (evidence.length) {
        if (resources >= 3 && citations >= 1) {
          score = "strong";
          rationale = `${resources} resources opened and memo cites sources.`;
        } else if (resources >= 2) {
          score = citations ? "observed" : "limited";
          rationale = `${resources} resources opened${citations ? " with citation language" : " without clear citations"}.`;
        } else if (resources >= 1 || citations) {
          score = "limited";
          rationale = "Sparse resource or citation evidence.";
        }
      }
      dims.push(dimResult(score, "Evidence discipline", rationale, evidence));
    }
    {
      const evidence = [];
      if (session.integrityStrong) evidence.push("integrityStrong:true");
      if (session.integrityConcern) evidence.push("integrityConcern:true");
      evidence.push(...eventIds(["integrity_response"]).slice(0, 2));
      let score = "none";
      let rationale = "No integrity pressure response recorded.";
      const concerns = [];
      if (session.integrityConcern) {
        score = "limited";
        rationale = "Integrity concern flag set (candidate signaled willingness to soften or omit risk).";
        concerns.push("Integrity concern: possible risk sanitization under pressure.");
      } else if (session.integrityStrong) {
        score = "strong";
        rationale = "Candidate explicitly refused to hide or omit material risk under pressure.";
      } else if (evidence.length) {
        score = "limited";
        rationale = "Integrity-related event present without a clear strong/concern flag.";
      }
      dims.push(dimResult(score, "Integrity", rationale, evidence, void 0, concerns, [
        "A partner asks you to soften a risk in the memo \u2014 how do you respond?"
      ]));
    }
    {
      const evidence = [];
      const actions = aiLog.map((a) => String(a.action || "").toLowerCase());
      for (const a of aiLog.slice(0, 8)) {
        evidence.push(`ai:${a.id || a.action}:${a.action}`);
      }
      const accepts = actions.filter((a) => a === "accept").length;
      const edits = actions.filter((a) => a === "edit").length;
      const rejects = actions.filter((a) => a === "reject").length;
      const caught = actions.filter((a) => a === "caught_error" || a === "catch_error").length;
      const asks = actions.filter((a) => a === "ask" || a === "prompt").length;
      let score = "none";
      let rationale = "No AI usage log entries.";
      if (aiLog.length) {
        if ((edits || rejects || caught) && asks) {
          score = caught || edits + rejects >= 1 && accepts <= edits + rejects ? "strong" : "observed";
          rationale = `AI usage shows ask=${asks}, accept=${accepts}, edit=${edits}, reject=${rejects}, caught_error=${caught}.`;
        } else if (accepts && !edits && !rejects && !caught) {
          score = "limited";
          rationale = "AI outputs were accepted without recorded edit/reject/error-catch behavior.";
        } else {
          score = "observed";
          rationale = `AI usage recorded (${aiLog.length} action(s)).`;
        }
      }
      dims.push(dimResult(score, "AI judgment", rationale, evidence, void 0, [], [
        "Show me an AI suggestion you rejected or edited \u2014 what was wrong with it?"
      ]));
    }
    return dims;
  }
  function findDim(dims, namePart) {
    const re = new RegExp(namePart, "i");
    return dims.find((d) => re.test(d.dimension));
  }
  function evaluateSession(session, options = {}) {
    if (!session || typeof session !== "object") {
      throw new Error("evaluateSession: session is required");
    }
    const scenario = session.scenario || options.scenario || null;
    const plantedErrors = scenario && Array.isArray(scenario.planted_errors) ? scenario.planted_errors : [];
    const ambiguityPoints = scenario && Array.isArray(scenario.ambiguity_points) ? scenario.ambiguity_points : [];
    const commitments = evaluateCommitments(session);
    const fulfilled = commitments.filter((c) => c.status === "fulfilled");
    const missed = commitments.filter((c) => c.status === "missed");
    const open = commitments.filter((c) => c.status === "open");
    const errors_caught = [];
    const errors_missed = [];
    const plantedEvidence = [];
    for (const err of plantedErrors) {
      const { caught, evidence } = detectPlantedError(session, err);
      if (caught) {
        errors_caught.push(err.id);
        plantedEvidence.push({ id: err.id, caught: true, evidence });
      } else {
        errors_missed.push(err.id);
        plantedEvidence.push({ id: err.id, caught: false, evidence });
      }
    }
    const ambiguity_handling = ambiguityPoints.map((p) => scoreAmbiguity(session, p));
    const dimension_scores = scoreDimensions(
      session,
      commitments,
      errors_caught,
      plantedErrors.length
    );
    const aiDim = findDim(dimension_scores, "AI judgment");
    const ai_usage_quality = {
      score: aiDim ? aiDim.score : "none",
      rationale: aiDim ? aiDim.rationale : "No AI usage evidence.",
      evidence: aiDim ? aiDim.evidence.slice() : []
    };
    const follow_through = {
      fulfilled: fulfilled.map((c) => ({ id: c.id, type: c.type, phrase: c.phrase })),
      missed: missed.map((c) => ({ id: c.id, type: c.type, phrase: c.phrase })),
      open: open.map((c) => ({ id: c.id, type: c.type, phrase: c.phrase }))
    };
    const memoLen = String(session.finalMemo || "").trim().length;
    const resources = resourceCount2(session);
    const riskCount = (session.risks || []).length;
    const events = listEvents(session);
    const eventCount = events.length;
    const finDim = findDim(dimension_scores, "Analytical|Financial");
    const riskDim = findDim(dimension_scores, "Risk detection");
    let executive_recommendation = "Hold";
    if (session.integrityConcern || memoLen < 300 || riskCount < 1 || resources < 2) {
      executive_recommendation = "Reject";
    } else if (finDim && isObservedOrStrong(finDim.score) && riskDim && isObservedOrStrong(riskDim.score) && !session.integrityConcern && memoLen >= 300 && errors_caught.length >= 1) {
      executive_recommendation = "Advance";
    }
    let confidence = "Low";
    if (eventCount >= 12 && resources >= 3 && memoLen >= 300) confidence = "High";
    else if (eventCount >= 6) confidence = "Medium";
    const hard_skill_evidence = [];
    if (modelViewed(session)) hard_skill_evidence.push({ type: "model_viewed", evidence: ["model interaction recorded"] });
    if ((session.assumptions || []).length) {
      hard_skill_evidence.push({
        type: "assumptions",
        evidence: (session.assumptions || []).slice(0, 5).map((a) => asText(a).slice(0, 120))
      });
    }
    if (riskCount) {
      hard_skill_evidence.push({
        type: "risks",
        evidence: (session.risks || []).slice(0, 5).map((r) => asText(r).slice(0, 120))
      });
    }
    if (errors_caught.length) {
      hard_skill_evidence.push({ type: "planted_errors_caught", evidence: errors_caught.slice() });
    }
    if (session.selectedScenario === "downside" || session.fin && session.fin.scenario === "downside") {
      hard_skill_evidence.push({ type: "downside_case", evidence: ["downside scenario selected"] });
    }
    const behavioral_evidence = [];
    if (curveballViewed(session)) behavioral_evidence.push({ type: "curveball_viewed", evidence: ["management update / curveball viewed"] });
    if (commitments.length) {
      behavioral_evidence.push({
        type: "commitments",
        evidence: commitments.map((c) => `${c.status}:${c.type}:${c.phrase || ""}`)
      });
    }
    if (session.integrityStrong) behavioral_evidence.push({ type: "integrity_strong", evidence: ["integrityStrong:true"] });
    if (session.integrityConcern) behavioral_evidence.push({ type: "integrity_concern", evidence: ["integrityConcern:true"] });
    for (const a of ambiguity_handling) {
      behavioral_evidence.push({
        type: "ambiguity",
        evidence: [`${a.ambiguity_point_id}:${a.response_quality}`, ...(a.evidence || []).slice(0, 2)]
      });
    }
    const strengths = [];
    const watch_areas = [];
    for (const d of dimension_scores) {
      if (d.score === "strong" || d.score === "observed") {
        strengths.push(`${d.dimension}: ${d.rationale}`);
      }
      if (d.score === "limited" || d.score === "none") {
        watch_areas.push(`${d.dimension}: ${d.rationale}`);
      }
      for (const c of d.concerns || []) watch_areas.push(c);
    }
    if (errors_missed.length) {
      watch_areas.push(`Planted errors missed: ${errors_missed.join(", ")}`);
    }
    if (missed.length) {
      watch_areas.push(`Follow-through missed: ${missed.map((c) => c.type).join(", ")}`);
    }
    const interview_questions = [];
    for (const d of dimension_scores) {
      for (const q of d.interviewFollowUps || []) {
        if (q && !interview_questions.includes(q)) interview_questions.push(q);
      }
    }
    if (errors_missed.includes("err_top10_retention")) {
      interview_questions.push("Did you notice anything unusual in top-10 cohort retention versus the headline rate?");
    }
    if (errors_missed.includes("err_exit_multiple")) {
      interview_questions.push("How did management\u2019s exit multiple compare to the precedent range you saw?");
    }
    if (errors_missed.includes("err_synergy_doublecount")) {
      interview_questions.push("How did you test whether synergy claims double-count organic growth?");
    }
    const benchmark = {
      status: "insufficient_data",
      comparison_text: "Not enough completed pilot sessions yet to benchmark against past hires."
    };
    const evidence_timeline = events.map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      type: e.type,
      label: e.payload && (e.payload.label || e.payload.detail || e.payload.title) || e.type
    }));
    const summaryParts = [];
    summaryParts.push(
      `Session ${session.id} evaluated from ${eventCount} event(s), ${resources} resource(s), memo ${memoLen} chars, ${riskCount} risk(s).`
    );
    summaryParts.push(
      `Planted errors: ${errors_caught.length} caught, ${errors_missed.length} missed` + (plantedErrors.length ? ` of ${plantedErrors.length}.` : " (none defined on scenario).")
    );
    if (finDim) summaryParts.push(`Financial reasoning: ${finDim.label}.`);
    if (riskDim) summaryParts.push(`Risk detection: ${riskDim.label}.`);
    if (session.integrityConcern) {
      summaryParts.push("Integrity concern flag is set \u2014 recommendation constrained.");
    } else if (session.integrityStrong) {
      summaryParts.push("Integrity strong flag is set from pressure response.");
    }
    if (confidence === "Low") {
      summaryParts.push("Overall confidence is Low because the evidence trail is thin.");
    } else if (confidence === "Medium") {
      summaryParts.push("Overall confidence is Medium based on partial activity volume.");
    } else {
      summaryParts.push("Overall confidence is High based on event volume, resources, and memo length.");
    }
    const overall_summary = summaryParts.join(" ");
    const memoLines = [];
    memoLines.push(`Recommendation: ${executive_recommendation} (confidence: ${confidence}).`);
    memoLines.push(overall_summary);
    if (strengths.length) memoLines.push(`Strengths: ${strengths.slice(0, 3).join(" | ")}`);
    if (watch_areas.length) memoLines.push(`Watch areas: ${watch_areas.slice(0, 4).join(" | ")}`);
    memoLines.push(benchmark.comparison_text);
    const final_memo = memoLines.join("\n\n");
    return {
      session_id: session.id,
      scenario_id: session.scenarioId || scenario && scenario.id || null,
      evaluated_at: (/* @__PURE__ */ new Date()).toISOString(),
      dimension_scores,
      errors_caught,
      errors_missed,
      planted_error_detail: plantedEvidence,
      ambiguity_handling,
      ai_usage_quality,
      follow_through,
      overall_summary,
      executive_recommendation,
      confidence,
      hard_skill_evidence,
      behavioral_evidence,
      strengths,
      watch_areas,
      interview_questions,
      benchmark,
      final_memo,
      evidence_timeline,
      meta: {
        event_count: eventCount,
        resource_count: resources,
        memo_length: memoLen,
        risk_count: riskCount,
        options: options && typeof options === "object" ? { ...options, scenario: void 0 } : {}
      }
    };
  }
  function formatEvaluationForReport(evaluation) {
    if (!evaluation || typeof evaluation !== "object") {
      return {
        header: { title: "Evidence report", recommendation: null, confidence: "Low" },
        sections: [],
        benchmark: {
          status: "insufficient_data",
          comparison_text: "Not enough completed pilot sessions yet to benchmark against past hires."
        }
      };
    }
    const dims = evaluation.dimension_scores || [];
    return {
      header: {
        title: "Evidence report",
        session_id: evaluation.session_id,
        recommendation: evaluation.executive_recommendation,
        confidence: evaluation.confidence,
        summary: evaluation.overall_summary
      },
      recommendation_banner: {
        decision: evaluation.executive_recommendation,
        confidence: evaluation.confidence,
        rationale: evaluation.overall_summary
      },
      dimensions: dims.map((d) => ({
        name: d.dimension,
        score: d.score,
        label: d.label,
        confidence: d.confidence,
        rationale: d.rationale,
        evidence: d.evidence || [],
        concerns: d.concerns || [],
        interview_follow_ups: d.interviewFollowUps || []
      })),
      planted_errors: {
        caught: evaluation.errors_caught || [],
        missed: evaluation.errors_missed || []
      },
      ambiguity: evaluation.ambiguity_handling || [],
      ai_usage: evaluation.ai_usage_quality || null,
      follow_through: evaluation.follow_through || { fulfilled: [], missed: [], open: [] },
      hard_skills: evaluation.hard_skill_evidence || [],
      behavioral: evaluation.behavioral_evidence || [],
      strengths: evaluation.strengths || [],
      watch_areas: evaluation.watch_areas || [],
      interview_questions: evaluation.interview_questions || [],
      timeline: evaluation.evidence_timeline || [],
      benchmark: evaluation.benchmark || {
        status: "insufficient_data",
        comparison_text: "Not enough completed pilot sessions yet to benchmark against past hires."
      },
      final_memo: evaluation.final_memo || "",
      sections: [
        {
          id: "summary",
          title: "Executive summary",
          body: evaluation.overall_summary
        },
        {
          id: "dimensions",
          title: "Dimension scores",
          items: dims.map((d) => ({
            title: d.dimension,
            subtitle: d.label,
            body: d.rationale,
            evidence: d.evidence
          }))
        },
        {
          id: "errors",
          title: "Planted errors",
          body: `Caught: ${(evaluation.errors_caught || []).join(", ") || "none"}. Missed: ${(evaluation.errors_missed || []).join(", ") || "none"}.`
        },
        {
          id: "follow_through",
          title: "Follow-through",
          body: `Fulfilled ${(evaluation.follow_through && evaluation.follow_through.fulfilled || []).length}, missed ${(evaluation.follow_through && evaluation.follow_through.missed || []).length}, open ${(evaluation.follow_through && evaluation.follow_through.open || []).length}.`
        },
        {
          id: "interview",
          title: "Interview follow-ups",
          items: (evaluation.interview_questions || []).map((q) => ({ title: q }))
        },
        {
          id: "benchmark",
          title: "Benchmark",
          body: evaluation.benchmark && evaluation.benchmark.comparison_text || "Not enough completed pilot sessions yet to benchmark against past hires."
        },
        {
          id: "memo",
          title: "Final memo",
          body: evaluation.final_memo
        }
      ]
    };
  }

  // js/sim/chat.js
  function ensureNoRepeat(session, messageText) {
    if (!session) return false;
    if (!Array.isArray(session.usedMessageVariantIds)) session.usedMessageVariantIds = [];
    const text = String(messageText || "").trim();
    if (!text) return false;
    const key = `body:${text}`;
    if (session.usedMessageVariantIds.includes(key)) return false;
    const prior = (session.chatMessages || []).some(
      (m) => String(m && (m.body || m.text) || "").trim() === text
    );
    if (prior) return false;
    session.usedMessageVariantIds.push(key);
    session._dirty = true;
    return true;
  }
  function claimVariant(session, variantId, body) {
    if (!session) return false;
    if (!Array.isArray(session.usedMessageVariantIds)) session.usedMessageVariantIds = [];
    if (variantId && session.usedMessageVariantIds.includes(variantId)) return false;
    if (body && session.usedMessageVariantIds.includes(`body:${body}`)) return false;
    if (variantId) session.usedMessageVariantIds.push(variantId);
    if (body) session.usedMessageVariantIds.push(`body:${body}`);
    session._dirty = true;
    return true;
  }
  function pickStakeholderMessage(trigger, session) {
    if (!trigger) return null;
    const variants = normalizeVariants(trigger);
    if (!variants.length) return null;
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v || !v.body) continue;
      const id = v.id || `var_${trigger.id || "t"}_${i}`;
      if (!claimVariant(session, id, v.body)) continue;
      return {
        id,
        body: v.body,
        requiresResponse: !!(v.requiresResponse || trigger.requiresReply || trigger.requires_reply),
        stakeholderId: trigger.stakeholderId || trigger.id,
        name: trigger.name || trigger.stakeholder_name,
        role: trigger.role || trigger.stakeholder_role,
        triggerId: trigger.id,
        isCurveball: !!(trigger.isCurveball || trigger.is_curveball)
      };
    }
    const deepen = deepenFallback(trigger, session);
    if (deepen && ensureNoRepeat(session, deepen)) {
      return {
        id: `deepen_${trigger.id || "t"}_${Date.now().toString(36)}`,
        body: deepen,
        requiresResponse: false,
        stakeholderId: trigger.stakeholderId || trigger.id,
        name: trigger.name || trigger.stakeholder_name,
        role: trigger.role || trigger.stakeholder_role,
        triggerId: trigger.id
      };
    }
    return null;
  }
  function normalizeVariants(trigger) {
    const raw = trigger.message_variants || [];
    return raw.map((v, i) => {
      if (typeof v === "string") {
        return { id: `${trigger.id || "t"}_v${i}`, body: v, requiresResponse: !!trigger.requires_reply };
      }
      return {
        id: v.id || `${trigger.id || "t"}_v${i}`,
        body: v.body || v.text || "",
        requiresResponse: v.requiresResponse
      };
    }).filter((v) => v.body);
  }
  function deepenFallback(trigger, session) {
    const tab = session && session.currentTab || "the model";
    const n = (session && session.usedMessageVariantIds || []).length;
    const lines = [
      `Thanks \u2014 before we lock anything, can you walk me through what you see in ${tab}?`,
      `Got it. One more push: what would change your mind on this call?`,
      `Appreciate the update. Flag the single biggest risk you want the committee to own.`,
      `Understood. Summarize the assumption you are least confident in.`
    ];
    return lines[n % lines.length];
  }
  function triggersOf(scenario) {
    if (!scenario) return [];
    if (Array.isArray(scenario.stakeholder_triggers)) return scenario.stakeholder_triggers;
    if (Array.isArray(scenario.stakeholder_script)) return scenario.stakeholder_script;
    return [];
  }
  function matchFollowups(trigger, candidateMessage) {
    const text = String(candidateMessage || "").toLowerCase();
    const hits = [];
    const fu = trigger.reply_followups;
    if (Array.isArray(fu)) {
      for (const item of fu) {
        const pat = item.candidate_reply_pattern || item.pattern;
        if (!pat) continue;
        try {
          if (new RegExp(pat, "i").test(text)) {
            hits.push({
              id: item.id,
              body: item.follow_up_message || item.body,
              integrity_concern: item.integrity_concern,
              integrity_strong: item.integrity_strong
            });
          }
        } catch (e) {
        }
      }
      return hits;
    }
    if (fu && typeof fu === "object") {
      for (const [key, arr] of Object.entries(fu)) {
        let matched = false;
        try {
          matched = new RegExp(key, "i").test(text);
        } catch (e) {
          matched = text.includes(String(key).toLowerCase());
        }
        if (!matched) continue;
        for (const item of arr || []) {
          hits.push({
            id: item.id,
            body: item.body || item.follow_up_message,
            integrity_concern: item.integrity_concern,
            integrity_strong: item.integrity_strong
          });
        }
      }
    }
    return hits;
  }
  function generateStakeholderReply(candidateMessage, session, scenario) {
    const scen = scenario || session && session.scenario || null;
    const triggers = triggersOf(scen);
    const primary = triggers.find((t) => /manager|cfo|finance/i.test(String(t.role || t.stakeholder_role || t.name || t.stakeholder_name || t.id || ""))) || triggers[0] || null;
    const name = primary && (primary.name || primary.stakeholder_name) || "Jordan Lee";
    const role = primary && (primary.role || primary.stakeholder_role) || "Finance Manager";
    if (session && candidateMessage) {
      detectCommitments(candidateMessage, session);
      if (!Array.isArray(session.chatMessages)) session.chatMessages = [];
      session.chatMessages.push({
        id: `msg_${Date.now().toString(36)}`,
        from: "candidate",
        senderType: "candidate",
        body: String(candidateMessage),
        at: (/* @__PURE__ */ new Date()).toISOString()
      });
      logEvent(session, "stakeholder_message_sent", {
        label: "Candidate replied in chat",
        detail: String(candidateMessage).slice(0, 120),
        dim: "communication",
        category: "chat",
        section: "chat"
      });
    }
    let pool = [];
    for (const t of triggers) {
      pool = pool.concat(matchFollowups(t, candidateMessage));
    }
    if (!pool.length && primary) {
      for (const v of normalizeVariants(primary)) {
        pool.push(v);
      }
    }
    let chosen = null;
    for (const v of pool) {
      if (!v || !v.body) continue;
      if (claimVariant(session, v.id || null, v.body)) {
        chosen = v;
        break;
      }
    }
    let body;
    if (chosen) {
      body = chosen.body;
      if (session) {
        if (chosen.integrity_concern) session.integrityConcern = true;
        if (chosen.integrity_strong) {
          session.integrityStrong = true;
          session.integrityConcern = false;
        }
      }
    } else {
      body = contextualFallback(candidateMessage, session);
      ensureNoRepeat(session, body);
    }
    const reply = {
      id: chosen && chosen.id || `reply_${Date.now().toString(36)}`,
      body,
      name,
      role,
      senderType: "manager",
      requiresResponse: false
    };
    if (session) {
      if (!Array.isArray(session.chatMessages)) session.chatMessages = [];
      session.chatMessages.push({
        id: reply.id,
        from: "stakeholder",
        senderType: reply.senderType,
        senderName: reply.name,
        senderRole: reply.role,
        body: reply.body,
        requiresResponse: reply.requiresResponse,
        at: (/* @__PURE__ */ new Date()).toISOString()
      });
      logEvent(session, "stakeholder_message_received", {
        label: `${reply.name} replied`,
        detail: reply.body.slice(0, 120),
        dim: "communication",
        category: "chat",
        section: "chat"
      });
      session._dirty = true;
    }
    return reply;
  }
  function contextualFallback(candidateMessage, session) {
    const tab = session && session.currentTab || "the work";
    const hasRisks = session && Array.isArray(session.risks) && session.risks.length > 0;
    const hasAssumptions = session && Array.isArray(session.assumptions) && session.assumptions.length > 0;
    const t = String(candidateMessage || "").toLowerCase();
    if (/retention|churn|cohort|top-?10|concentrat/.test(t)) {
      return "On retention \u2014 separate the blended number from the top-10 cohort before you lean on it in the memo.";
    }
    if (/multiple|exit|precedent|valuation/.test(t)) {
      return "Check the exit multiple against the precedent range in the market memo before you treat plan multiple as base case.";
    }
    if (/downside|stress|bear|worst/.test(t)) {
      return "Good \u2014 run the downside case in the model and tell me which driver moves EV the most.";
    }
    if (/\?|clarif|which|what about|should i/.test(t)) {
      return `Happy to clarify. What specifically are you stuck on in ${tab}?`;
    }
    if (!hasAssumptions) {
      return "Before we go further, write down the assumption you are relying on most \u2014 we need that in the trail.";
    }
    if (!hasRisks) {
      return "I still do not see a risk logged. What is the failure mode you are most worried about?";
    }
    const snippet = String(candidateMessage || "").trim().slice(0, 40);
    return snippet ? `Noted on \u201C${snippet}${String(candidateMessage).trim().length > 40 ? "\u2026" : ""}\u201D. Tie that back to a number in the model or a risk in the register.` : `Thanks \u2014 keep going in ${tab} and ping me when you have a draft call.`;
  }

  // js/sim/fyModel.js
  function mulberry32(a) {
    let t = a >>> 0;
    return function next() {
      t = t + 1831565813 >>> 0;
      let r = Math.imul(t ^ t >>> 15, 1 | t);
      r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
      return ((r ^ r >>> 14) >>> 0) / 4294967296;
    };
  }
  function seedToUint32(seed) {
    if (typeof seed === "number" && Number.isFinite(seed)) {
      return seed >>> 0;
    }
    const s = String(seed != null ? seed : "fydell");
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function roundTo(value, decimals) {
    if (decimals == null) return value;
    const f = 10 ** decimals;
    return Math.round(value * f) / f;
  }
  function instantiateAssumptions(base, rules, seed) {
    const out = { ...base || {} };
    const rand = mulberry32(seedToUint32(seed));
    let list = [];
    if (Array.isArray(rules)) {
      list = rules;
    } else if (rules && typeof rules === "object") {
      list = Object.keys(rules).map((key) => ({ key, ...rules[key] }));
    }
    for (const rule of list) {
      if (!rule || !rule.key) continue;
      const key = rule.key;
      let value;
      if (rule.distribution === "choice" && Array.isArray(rule.choices) && rule.choices.length) {
        const idx = Math.floor(rand() * rule.choices.length);
        value = rule.choices[idx];
      } else {
        const min = rule.min != null ? Number(rule.min) : Number(out[key]) || 0;
        const max = rule.max != null ? Number(rule.max) : min;
        value = min + (max - min) * rand();
        value = roundTo(value, rule.decimals != null ? rule.decimals : 1);
      }
      out[key] = value;
    }
    return out;
  }
  var DEFAULT_HIST = {
    fy2023: {
      rev: 903,
      gp: 551,
      opex: 416,
      ebitda: 135,
      ni: 81,
      ocf: 148,
      capex: 36,
      fcf: 112,
      ret: 94,
      churn: 6
    },
    fy2024: {
      rev: 1038.2,
      gp: 643.7,
      opex: 436,
      ebitda: 207.6,
      ni: 124.6,
      ocf: 228,
      capex: 42,
      fcf: 186,
      ret: 93,
      churn: 7
    }
  };
  function normalizeDrivers(assumptions) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o;
    const a = assumptions || {};
    const g = num((_c = (_b = (_a = a.growth_rate) != null ? _a : a.g) != null ? _b : a.revenue_growth) != null ? _c : a.growth, 15);
    const m = num((_e = (_d = a.ebitda_margin) != null ? _d : a.m) != null ? _e : a.margin, 20);
    const gm = num((_f = a.gross_margin) != null ? _f : a.gm, 62);
    const opexg = num((_g = a.opex_growth) != null ? _g : a.opexg, 10);
    const ret = num((_i = (_h = a.net_retention) != null ? _h : a.ret) != null ? _i : a.retention, 93);
    const mult = num((_k = (_j = a.exit_multiple) != null ? _j : a.mult) != null ? _k : a.multiple, 11);
    const offer = num((_m = (_l = a.offer_price) != null ? _l : a.offer) != null ? _m : a.offer_ev, 2400);
    const ltmRevenue = num((_o = (_n = a.revenue_ltm) != null ? _n : a.ltmRevenue) != null ? _o : a.ltm_revenue, 1038.2);
    const hist = a.hist && typeof a.hist === "object" ? a.hist : {
      fy2023: {
        ...DEFAULT_HIST.fy2023,
        rev: num(a.revenue_fy2023, DEFAULT_HIST.fy2023.rev)
      },
      fy2024: {
        ...DEFAULT_HIST.fy2024,
        rev: num(a.revenue_fy2024, DEFAULT_HIST.fy2024.rev)
      }
    };
    const scenario = String(a.scenario || "base");
    return { g, m, gm, opexg, ret, mult, offer, ltmRevenue, hist, scenario };
  }
  function num(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  function calculateModel(assumptions) {
    const d = normalizeDrivers(assumptions);
    const h23 = d.hist.fy2023 || DEFAULT_HIST.fy2023;
    const h24 = d.hist.fy2024 || DEFAULT_HIST.fy2024;
    const g = d.g / 100;
    const m = d.m / 100;
    const gm = d.gm / 100;
    const opexg = d.opexg / 100;
    const ret = d.ret;
    const mult = d.mult;
    const churn = Math.max(0, 100 - ret);
    const yrs = [];
    let rev = h24.rev != null ? h24.rev : d.ltmRevenue;
    let opex = h24.opex != null ? h24.opex : rev * (1 - gm) - rev * m;
    let prevRev = h23.rev || rev / 1.15;
    for (let i = 0; i < 4; i++) {
      prevRev = rev;
      rev = rev * (1 + g);
      const gp = rev * gm;
      opex = opex * (1 + opexg);
      const ebitda = rev * m;
      if (Math.abs(rev - gp - opex) > rev * 0.35) {
        opex = Math.max(rev - gp - ebitda, rev * 0.25);
      }
      const ni = ebitda * 0.6;
      const ocf = ebitda * 1.08;
      const capex = rev * 0.04;
      const fcf = ocf - capex;
      const yoy = (rev / prevRev - 1) * 100;
      yrs.push({
        year: 2025 + i,
        rev,
        yoy,
        gp,
        gm: gm * 100,
        opex,
        ebitda,
        em: m * 100,
        ni,
        ocf,
        capex,
        fcf,
        ret,
        churn,
        mult
      });
    }
    const exitEbitda = yrs[3].ebitda;
    const ev = exitEbitda * mult;
    const fwdRev = yrs[0].rev;
    return {
      drivers: {
        g: d.g,
        m: d.m,
        gm: d.gm,
        opexg: d.opexg,
        ret,
        mult,
        scenario: d.scenario
      },
      hist: { fy2023: h23, fy2024: h24 },
      yrs,
      rev: fwdRev,
      ebitda: yrs[0].ebitda,
      exitEbitda,
      ev,
      evRev: ev / fwdRev,
      evEbitda: mult,
      churn,
      offer: d.offer,
      gap: ev - d.offer
    };
  }
  function scenarioPack(name, assumptions = {}, presets) {
    const base = { ...assumptions };
    const presetMap = presets || base._scenario_presets || null;
    const delta = presetMap && presetMap[name] ? presetMap[name] : null;
    let overlay;
    if (delta && Object.keys(delta).length) {
      overlay = applyPresetDeltas(base, delta);
    } else {
      const defaults = {
        base: {},
        downside: {
          growth_rate_delta: -7,
          net_retention_delta: -8,
          exit_multiple_delta: -2,
          ebitda_margin_delta: -3
        },
        upside: {
          growth_rate_delta: 3,
          net_retention_delta: 3,
          exit_multiple_delta: 1,
          ebitda_margin_delta: 2
        }
      };
      overlay = applyPresetDeltas(base, defaults[name] || {});
    }
    const merged = { ...base, ...overlay, scenario: name || "base" };
    syncAssumptionAliases(merged);
    return merged;
  }
  function applyPresetDeltas(base, delta) {
    var _a, _b, _c, _d, _e, _f, _g;
    const out = {};
    const g = num((_b = (_a = base.growth_rate) != null ? _a : base.g) != null ? _b : base.revenue_growth, 15);
    const m = num((_c = base.ebitda_margin) != null ? _c : base.m, 20);
    const ret = num((_d = base.net_retention) != null ? _d : base.ret, 93);
    const mult = num((_e = base.exit_multiple) != null ? _e : base.mult, 11);
    const gm = num((_f = base.gross_margin) != null ? _f : base.gm, 62);
    const opexg = num((_g = base.opex_growth) != null ? _g : base.opexg, 10);
    if (delta.growth_rate_delta != null) out.growth_rate = g + Number(delta.growth_rate_delta);
    if (delta.net_retention_delta != null) out.net_retention = ret + Number(delta.net_retention_delta);
    if (delta.exit_multiple_delta != null) out.exit_multiple = roundTo(mult + Number(delta.exit_multiple_delta), 1);
    if (delta.ebitda_margin_delta != null) out.ebitda_margin = m + Number(delta.ebitda_margin_delta);
    if (delta.gross_margin_delta != null) out.gross_margin = gm + Number(delta.gross_margin_delta);
    if (delta.opex_growth_delta != null) out.opex_growth = opexg + Number(delta.opex_growth_delta);
    for (const key of ["growth_rate", "net_retention", "exit_multiple", "ebitda_margin", "gross_margin", "opex_growth", "g", "m", "ret", "mult", "gm", "opexg"]) {
      if (delta[key] != null && !String(key).endsWith("_delta")) out[key] = delta[key];
    }
    return out;
  }
  function syncAssumptionAliases(merged) {
    if (merged.growth_rate != null) {
      merged.g = merged.growth_rate;
      merged.revenue_growth = merged.growth_rate;
    } else if (merged.g != null) {
      merged.growth_rate = merged.g;
      merged.revenue_growth = merged.g;
    }
    if (merged.ebitda_margin != null) merged.m = merged.ebitda_margin;
    else if (merged.m != null) merged.ebitda_margin = merged.m;
    if (merged.net_retention != null) merged.ret = merged.net_retention;
    else if (merged.ret != null) merged.net_retention = merged.ret;
    if (merged.exit_multiple != null) merged.mult = merged.exit_multiple;
    else if (merged.mult != null) merged.exit_multiple = merged.mult;
    if (merged.gross_margin != null) merged.gm = merged.gross_margin;
    else if (merged.gm != null) merged.gross_margin = merged.gm;
    if (merged.opex_growth != null) merged.opexg = merged.opex_growth;
    else if (merged.opexg != null) merged.opex_growth = merged.opexg;
    if (merged.offer_price != null) merged.offer = merged.offer_price;
    else if (merged.offer != null) merged.offer_price = merged.offer;
  }

  // js/sim/scenario.js
  var import_meta = {};
  async function loadMeridianTemplate() {
    try {
      const mod = await Promise.resolve().then(() => (init_meridian_scenario(), meridian_scenario_exports));
      return mod && (mod.default || mod) || null;
    } catch (e) {
    }
    try {
      const mod = await Promise.resolve().then(() => __toESM(require_meridian_scenario()));
      return mod && (mod.default || mod) || null;
    } catch (e) {
    }
    try {
      const { createRequire } = await import("module");
      const require2 = createRequire(import_meta.url);
      return require2("./content/meridian.scenario.json");
    } catch (e) {
      return null;
    }
  }
  function resolveMeridianTemplate(template) {
    return template && typeof template === "object" ? template : null;
  }
  function formatPlaceholder(n, style) {
    if (!Number.isFinite(n)) return String(n);
    switch (style) {
      case "pct":
        return `${Number(n).toFixed(Number.isInteger(n) ? 0 : 1)}%`;
      case "x":
        return `${Number(n).toFixed(1)}x`;
      case "usd_m":
        return `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 1 })}M`;
      case "usd_b":
        return `$${(Number(n) / 1e3).toLocaleString("en-US", { maximumFractionDigits: 2 })}B`;
      case "int":
        return `${Math.round(n)}`;
      case "raw":
        return String(Number.isInteger(n) ? n : Number(n).toFixed(1));
      default:
        return String(Number.isInteger(n) ? n : Number(n).toFixed(1));
    }
  }
  function num2(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  function buildTokenMap(assumptions, model) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _A, _B, _C;
    const a = assumptions || {};
    const m = model || {};
    const drivers = m.drivers || {};
    const growth = num2((_c = (_b = (_a = a.growth_rate) != null ? _a : a.revenue_growth) != null ? _b : a.g) != null ? _c : drivers.g, 15);
    const margin = num2((_e = (_d = a.ebitda_margin) != null ? _d : a.m) != null ? _e : drivers.m, 20);
    const retention = num2((_g = (_f = a.net_retention) != null ? _f : a.ret) != null ? _g : drivers.ret, 93);
    const multiple = num2((_i = (_h = a.exit_multiple) != null ? _h : a.mult) != null ? _i : drivers.mult, 11);
    const gm = num2((_k = (_j = a.gross_margin) != null ? _j : a.gm) != null ? _k : drivers.gm, 62);
    const opexg = num2((_m = (_l = a.opex_growth) != null ? _l : a.opexg) != null ? _m : drivers.opexg, 10);
    const offer = num2((_o = (_n = a.offer_price) != null ? _n : a.offer) != null ? _o : m.offer, 2400);
    const ltm = num2((_s = (_p = a.revenue_ltm) != null ? _p : a.ltmRevenue) != null ? _s : (_r = (_q = m.hist) == null ? void 0 : _q.fy2024) == null ? void 0 : _r.rev, 1038.2);
    const fy23 = num2((_v = a.revenue_fy2023) != null ? _v : (_u = (_t = m.hist) == null ? void 0 : _t.fy2023) == null ? void 0 : _u.rev, 903);
    const fy24 = num2((_y = a.revenue_fy2024) != null ? _y : (_x = (_w = m.hist) == null ? void 0 : _w.fy2024) == null ? void 0 : _x.rev, 1038.2);
    const top10Ret = num2((_z = a.top10_retention) != null ? _z : a.top_10_retention, 88);
    const top10Arr = num2((_B = (_A = a.top10_arr_pct) != null ? _A : a.top10_arr_share) != null ? _B : a.top_10_arr_share, 41);
    const sectorGrowth = num2(a.sector_growth, 8.5);
    const precedentLow = num2(a.precedent_multiple_low, 8.5);
    const precedentHigh = num2(a.precedent_multiple_high, 10);
    const tokens = {
      // Meridian.scenario.json tokens
      growth_rate: formatPlaceholder(growth, "raw"),
      ebitda_margin: formatPlaceholder(margin, "raw"),
      gross_margin: formatPlaceholder(gm, "raw"),
      opex_growth: formatPlaceholder(opexg, "raw"),
      net_retention: formatPlaceholder(retention, "raw"),
      exit_multiple: formatPlaceholder(multiple, "raw"),
      offer_price: formatPlaceholder(offer, "raw"),
      revenue_ltm: formatPlaceholder(ltm, "raw"),
      revenue_fy2023: formatPlaceholder(fy23, "raw"),
      revenue_fy2024: formatPlaceholder(fy24, "raw"),
      top10_retention: formatPlaceholder(top10Ret, "raw"),
      top10_arr_pct: formatPlaceholder(top10Arr, "raw"),
      // Friendly aliases
      revenue_growth: formatPlaceholder(growth, "raw"),
      growth: formatPlaceholder(growth, "raw"),
      g: formatPlaceholder(growth, "raw"),
      margin: formatPlaceholder(margin, "raw"),
      m: formatPlaceholder(margin, "raw"),
      retention: formatPlaceholder(retention, "raw"),
      ret: formatPlaceholder(retention, "raw"),
      multiple: formatPlaceholder(multiple, "raw"),
      mult: formatPlaceholder(multiple, "raw"),
      gm: formatPlaceholder(gm, "raw"),
      offer: formatPlaceholder(offer, "raw"),
      offer_b: formatPlaceholder(offer, "usd_b"),
      ev: formatPlaceholder(m.ev, "raw"),
      gap: formatPlaceholder(m.gap, "raw"),
      exit_ebitda: formatPlaceholder(m.exitEbitda, "raw"),
      ltm_revenue: formatPlaceholder(ltm, "raw"),
      top_10_retention: formatPlaceholder(top10Ret, "raw"),
      top10_arr_share: formatPlaceholder(top10Arr, "raw"),
      top_10_arr_share: formatPlaceholder(top10Arr, "raw"),
      sector_growth: formatPlaceholder(sectorGrowth, "raw"),
      precedent_multiple_low: formatPlaceholder(precedentLow, "raw"),
      precedent_multiple_high: formatPlaceholder(precedentHigh, "raw"),
      precedent_range: `${formatPlaceholder(precedentLow, "raw")}\u2013${formatPlaceholder(precedentHigh, "raw")}`,
      variant_seed: String((_C = a._seed) != null ? _C : "")
    };
    for (const [k, v] of Object.entries(a)) {
      if (tokens[k] != null) continue;
      if (typeof v === "number") tokens[k] = formatPlaceholder(v, "raw");
      else if (typeof v === "string" || typeof v === "boolean") tokens[k] = String(v);
    }
    return tokens;
  }
  function fillPlaceholders(text, tokens) {
    if (text == null) return text;
    return String(text).replace(/\{\{\s*([a-zA-Z0-9_.]+)(?:\|([a-zA-Z0-9_]+))?\s*\}\}/g, (_, key, style) => {
      if (tokens[key] == null) return `{{${key}}}`;
      if (!style) return tokens[key];
      const raw = Number(String(tokens[key]).replace(/[^0-9.\-]/g, ""));
      if (Number.isFinite(raw)) return formatPlaceholder(raw, style);
      return tokens[key];
    });
  }
  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }
  function fillNode(node, tokens) {
    if (typeof node === "string") return fillPlaceholders(node, tokens);
    if (Array.isArray(node)) return node.map((n) => fillNode(n, tokens));
    if (node && typeof node === "object") {
      const out = {};
      for (const [k, v] of Object.entries(node)) {
        out[k] = fillNode(v, tokens);
      }
      return out;
    }
    return node;
  }
  function normalizeStakeholderTrigger(raw) {
    if (!raw || typeof raw !== "object") return raw;
    const variants = Array.isArray(raw.message_variants) ? raw.message_variants.map((v, i) => {
      if (typeof v === "string") {
        return {
          id: `${raw.id || "trig"}_v${i}`,
          body: v,
          requiresResponse: !!raw.requires_reply
        };
      }
      return {
        id: v.id || `${raw.id || "trig"}_v${i}`,
        body: v.body || v.text || "",
        requiresResponse: v.requiresResponse != null ? !!v.requiresResponse : !!raw.requires_reply
      };
    }) : [];
    const reply_followups = {};
    if (Array.isArray(raw.reply_followups)) {
      raw.reply_followups.forEach((fu, i) => {
        const key = fu.candidate_reply_pattern || fu.key || `fu_${i}`;
        if (!reply_followups[key]) reply_followups[key] = [];
        reply_followups[key].push({
          id: `${raw.id || "trig"}_fu${i}`,
          body: fu.follow_up_message || fu.body || "",
          requiresResponse: false,
          integrity_concern: !!fu.integrity_concern,
          integrity_strong: !!fu.integrity_strong,
          pattern: fu.candidate_reply_pattern || null
        });
      });
    } else if (raw.reply_followups && typeof raw.reply_followups === "object") {
      Object.assign(reply_followups, raw.reply_followups);
    }
    return {
      id: raw.id,
      stakeholderId: raw.stakeholderId || raw.id,
      name: raw.stakeholder_name || raw.name || "Colleague",
      role: raw.stakeholder_role || raw.role || "",
      when: raw.trigger_condition || raw.when || null,
      message_variants: variants,
      reply_followups,
      integrityPressure: !!(raw.integrity_pressure || raw.integrityPressure),
      isCurveball: !!(raw.is_curveball || raw.isCurveball),
      requiresReply: !!raw.requires_reply,
      relatedSignal: raw.related_signal || null,
      raw
    };
  }
  function instantiateScenario(template, seed) {
    var _a;
    if (!template || typeof template !== "object") {
      throw new Error("instantiateScenario: template object is required");
    }
    const resolvedSeed = seed != null && seed !== "" ? seed : seedToUint32(Date.now());
    const scenario = clone(template);
    const fm = scenario.financial_model || scenario.financialModel || {};
    const base = fm.base_assumptions || fm.baseAssumptions || fm.drivers || {};
    const rules = fm.randomization_rules || fm.randomizationRules || [];
    const assumptions = instantiateAssumptions(base, rules, resolvedSeed);
    assumptions._seed = resolvedSeed;
    if (fm.hist) assumptions.hist = clone(fm.hist);
    if (fm.offer != null) assumptions.offer = fm.offer;
    if (fm.offer_price != null || assumptions.offer_price != null) {
      assumptions.offer = (_a = assumptions.offer_price) != null ? _a : fm.offer_price;
      assumptions.offer_price = assumptions.offer;
    }
    if (fm.ltmRevenue != null) assumptions.ltmRevenue = fm.ltmRevenue;
    if (fm.scenario_presets) assumptions._scenario_presets = clone(fm.scenario_presets);
    const model = calculateModel(assumptions);
    const tokens = buildTokenMap(assumptions, model);
    if (scenario.mandate) scenario.mandate = fillPlaceholders(scenario.mandate, tokens);
    if (scenario.mandate_text) {
      scenario.mandate_text = fillPlaceholders(scenario.mandate_text, tokens);
      scenario.mandate = scenario.mandate || scenario.mandate_text;
    }
    if (Array.isArray(scenario.documents)) {
      scenario.documents = scenario.documents.map((doc) => fillNode(doc, tokens));
    }
    if (Array.isArray(scenario.docs)) {
      scenario.docs = scenario.docs.map((doc) => fillNode(doc, tokens));
    }
    const rawTriggers = scenario.stakeholder_triggers || scenario.stakeholder_script || [];
    if (Array.isArray(rawTriggers)) {
      scenario.stakeholder_triggers = rawTriggers.map(normalizeStakeholderTrigger).map((t) => fillNode(t, tokens));
    }
    if (Array.isArray(scenario.planted_errors)) {
      scenario.planted_errors = fillNode(scenario.planted_errors, tokens);
    }
    if (Array.isArray(scenario.ambiguity_points)) {
      scenario.ambiguity_points = fillNode(scenario.ambiguity_points, tokens);
    }
    scenario.financial_model = {
      ...fm,
      base_assumptions: assumptions,
      assumptions,
      // alias so callers can use either field
      randomization_rules: rules,
      instantiated: true,
      seed: resolvedSeed,
      computed: model
    };
    scenario.variantSeed = resolvedSeed;
    scenario.id = scenario.id || "meridian";
    scenario.title = scenario.title || "Project Meridian";
    scenario.role = scenario.role || scenario.role_context || "Finance Analyst";
    scenario.durationMin = scenario.durationMin || scenario.time_limit_minutes || 35;
    scenario.type = scenario.type || "financial_analysis";
    scenario.meta = {
      ...scenario.meta || {},
      instantiatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      seed: resolvedSeed
    };
    return scenario;
  }

  // js/sim/index.js
  var import_meridian_scenario = __toESM(require_meridian_scenario());

  // js/sim/meridian/index.ts
  var meridian_exports = {};
  __export(meridian_exports, {
    AMBIGUITY_POINT: () => AMBIGUITY_POINT,
    PLANTED_ERRORS: () => PLANTED_ERRORS,
    TARGET_COMPANIES: () => TARGET_COMPANIES,
    addAssumption: () => addAssumption,
    addRisk: () => addRisk,
    adjustValuation: () => adjustValuation,
    askAI: () => askAI,
    askMeridianAI: () => askMeridianAI,
    buildMeridianDocuments: () => buildMeridianDocuments,
    calculateMeridianProgress: () => calculateMeridianProgress,
    calculateValuation: () => calculateValuation,
    canSubmit: () => canSubmit2,
    canSubmitMeridian: () => canSubmitMeridian,
    createMeridianSession: () => createMeridianSession,
    evaluateMeridianSession: () => evaluateMeridianSession,
    finalizeAiUsage: () => finalizeAiUsage,
    formatMeridianReport: () => formatMeridianReport,
    getElapsedSec: () => getElapsedSec,
    getMeridianMissingRequirements: () => getMeridianMissingRequirements,
    getMissing: () => getMissing,
    getRemainingSec: () => getRemainingSec,
    getStageCompletion: () => getStageCompletion,
    handleCandidateChatReply: () => handleCandidateChatReply,
    hasRepliedToD1AndSubstantive: () => hasRepliedToD1AndSubstantive,
    instantiateMeridianSeed: () => instantiateMeridianSeed,
    isSubstantiveReply: () => isSubstantiveReply,
    log: () => log,
    openDocument: () => openDocument,
    recordAiAsk: () => recordAiAsk,
    replyToChat: () => replyToChat,
    setRecommendation: () => setRecommendation,
    submitMeridian: () => submitMeridian,
    syncElapsed: () => syncElapsed,
    synergyDoubleCountNote: () => synergyDoubleCountNote,
    tick: () => tick,
    tickChatTriggers: () => tickChatTriggers,
    viewBrief: () => viewBrief,
    viewFinancials: () => viewFinancials
  });

  // js/sim/meridian/seed.ts
  var TARGET_COMPANIES = [
    "Meridian Outdoor",
    "Meridian Outdoor Co",
    "Meridian Outdoor Group",
    "Meridian Outdoor Inc",
    "Meridian Outdoor LLC"
  ];
  function mulberry322(a) {
    let t = a >>> 0;
    return function next() {
      t = t + 1831565813 >>> 0;
      let r = Math.imul(t ^ t >>> 15, 1 | t);
      r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
      return ((r ^ r >>> 14) >>> 0) / 4294967296;
    };
  }
  function seedToUint322(seed) {
    if (typeof seed === "number" && Number.isFinite(seed)) return seed >>> 0;
    const s = String(seed != null ? seed : "meridian");
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function round(n, d) {
    const f = 10 ** d;
    return Math.round(n * f) / f;
  }
  function range(rand, min, max, decimals) {
    return round(min + (max - min) * rand(), decimals);
  }
  function buildHistory(q2_revenue, q2_arr, q2_headcount, q2_ebitda_margin, rand) {
    const rev_cagr = range(rand, 0.09, 0.14, 4);
    const arr_cagr = range(rand, 0.1, 0.16, 4);
    const quarters = ["Q2 2024", "Q3 2024", "Q4 2024", "Q1 2025", "Q2 2025"];
    const result = [];
    for (let i = 0; i < 5; i++) {
      const factor = (1 + rev_cagr) ** (i / 4);
      const rev = round(q2_revenue * factor * (0.95 + rand() * 0.1), 2);
      const arr = round(q2_arr * (1 + arr_cagr) ** (i / 4), 1);
      const em = round(q2_ebitda_margin - (4 - i) * 0.8 + (rand() - 0.5) * 1.5, 1);
      const hc = Math.round(q2_headcount * (1 + rev_cagr) ** (i / 4) * (0.95 + rand() * 0.1));
      const churn = round(6.5 + (rand() - 0.5) * 1.5, 1);
      result.push({ quarter: quarters[i], revenue: rev, arr, ebitda_margin: em, headcount: hc, churn_rate: churn });
    }
    return result;
  }
  var PEER_NAMES = [
    "Alpine Sports Direct (outdoor peer)",
    "TrailHead Gear Co",
    "Summit Outdoors Group",
    "Base Camp Equipment",
    "Ridge Line Brands"
  ];
  function instantiateMeridianSeed(seedInput) {
    const seed = String(seedInput != null ? seedInput : "meridian-default");
    const rand = mulberry322(seedToUint322(seed));
    const companyIndex = Math.floor(rand() * TARGET_COMPANIES.length);
    const company = TARGET_COMPANIES[companyIndex];
    const quarter = "Q3 2025";
    const q3_revenue_growth = range(rand, 11, 13, 1);
    const gross_margin = range(rand, 62, 64, 1);
    const churn_rate = range(rand, 6.5, 7.5, 1);
    const sales_cycle_days = 45;
    const new_hire_ramp_days = 30;
    const opex_growth = range(rand, 17, 19, 1);
    const cash_runway_months = 9;
    const enterprise_renewal_prob = range(rand, 83, 87, 1);
    const q2_revenue = range(rand, 3.2, 3.8, 2);
    const q2_arr = range(rand, 14, 20, 1);
    const q2_headcount = Math.round(range(rand, 42, 68, 0));
    const q2_ebitda_margin = range(rand, 10, 16, 1);
    const industry_churn_avg = range(rand, 4.5, 5.5, 1);
    const industry_sales_cycle_avg = range(rand, 50, 62, 0);
    const updated_sales_cycle_days = sales_cycle_days + 30;
    const at_risk_customer_count = 2;
    const at_risk_arr_pct = range(rand, 22, 32, 1);
    const hist = buildHistory(q2_revenue, q2_arr, q2_headcount, q2_ebitda_margin, rand);
    const sector_growth_low = range(rand, 7, 9, 1);
    const sector_growth_high = range(rand, 9.5, 12, 1);
    const comps = PEER_NAMES.map((name, i) => {
      const jitter = (i - 2) * 0.3 + (rand() - 0.5) * 0.4;
      const nrr = round(108 + jitter * 5, 1);
      return {
        name,
        year: 2024 + i % 2,
        ev_ebitda: nrr,
        // repurposed: peer NRR
        note: i % 2 === 0 ? "SaaS/outdoor peer" : "B2B subscription peer"
      };
    });
    const avg = round(comps.reduce((s, c) => s + c.ev_ebitda, 0) / comps.length, 1);
    return {
      seed,
      company,
      quarter,
      q3_revenue_growth,
      gross_margin,
      churn_rate,
      sales_cycle_days,
      new_hire_ramp_days,
      opex_growth,
      cash_runway_months,
      enterprise_renewal_prob,
      q2_revenue,
      q2_arr,
      q2_headcount,
      q2_ebitda_margin,
      industry_churn_avg,
      industry_sales_cycle_avg,
      updated_sales_cycle_days,
      at_risk_customer_count,
      at_risk_arr_pct,
      hist,
      // ── Compat aliases ──
      forward_growth: q3_revenue_growth,
      exit_multiple: gross_margin,
      comps_avg_multiple: avg,
      deal_value_label: `${quarter} Plan`,
      deal_value_b: round(q2_arr / 1e3, 2),
      ltm_revenue: round(q2_revenue * 4, 1),
      top10_concentration: at_risk_arr_pct,
      declining_top10_count: at_risk_customer_count,
      sector_growth_low,
      sector_growth_high,
      ebitda_margin_ltm: q2_ebitda_margin,
      comps
    };
  }
  function calculateValuation(input) {
    const q3_rev = round(input.ltm_ebitda * (1 + input.growth_rate / 100), 2);
    const margin_compression = Math.max(0, (input.discount_rate - input.growth_rate) / 2) / 100;
    const effective_margin = Math.max(0, input.exit_multiple / 100 - margin_compression);
    const q3_ebitda = round(q3_rev * effective_margin, 2);
    const bear = round(input.ltm_ebitda * (1 + (input.growth_rate - 4) / 100), 2);
    const bull = round(input.ltm_ebitda * (1 + (input.growth_rate + 2) / 100), 2);
    return {
      implied_ev: q3_rev,
      dcf_ev: q3_ebitda,
      range_low: Math.min(bear, q3_rev),
      range_high: Math.max(bull, q3_rev)
    };
  }

  // js/sim/meridian/documents.ts
  function buildMeridianDocuments(p) {
    const histRows = p.hist.map(
      (h) => `${h.quarter}	$${h.revenue}M	${h.arr}M ARR	${h.ebitda_margin}%	${h.headcount} FTE	${h.churn_rate}% churn`
    ).join("\n");
    const peerRows = p.comps.map((c) => `${c.name}	${c.year}	${c.ev_ebitda}% NRR	${c.note}`).join("\n");
    const briefMandate = `FROM: CFO, ${p.company}
RE: ${p.quarter} Hiring & Marketing Plan \u2014 VP Finance review

You are the VP of Finance at ${p.company}. The Q3 plan includes a significant investment in new hires (Sales and Marketing) and an expanded demand-generation spend. Before we present to the board, you need to pressure-test the forecast underlying these investments.

Your job: review the supporting data room materials, stress-test the key assumptions, identify the material risks, and deliver a short VP Memo. Your deliverable should state a clear recommendation (Go / Hold / Revise), your three key reasons, the risks you would flag, the assumptions you changed or questioned, and the verification steps you would take before approving the plan.

This is a real budget decision. We care as much about how you reason as about the final call.`;
    return [
      // ── 1. CFO Brief ─────────────────────────────────────────────────────
      {
        id: "cfo_brief",
        title: "CFO_Brief.pdf",
        tag: "Brief",
        kind: "pdf",
        body: `${briefMandate}

PLAN CONTEXT
The Q3 plan assumes ${p.q3_revenue_growth}% revenue growth, gross margin of ${p.gross_margin}%, and adds 8 net new hires in Sales and Marketing. Operating expenses are projected to grow ${p.opex_growth}% to support the hiring and demand-generation ramp. Cash runway is ${p.cash_runway_months} months at plan.

Working time: 25 minutes. Materials: Revenue Forecast, Churn Update, Hiring Plan, Customer Concentration Note.`
      },
      // ── 2. Revenue Forecast ───────────────────────────────────────────────
      {
        id: "revenue_forecast",
        title: "Revenue_Forecast.xlsx",
        tag: "Forecast",
        kind: "xlsx",
        body: `REVENUE FORECAST \u2014 ${p.company} ${p.quarter}

Quarterly trend:
Quarter	Revenue	ARR	EBITDA Margin	Headcount	Gross Churn
${histRows}

PLAN ASSUMPTIONS (management base case)
\u2022 Q3 revenue growth target: ${p.q3_revenue_growth}%
\u2022 Gross margin target: ${p.gross_margin}%
\u2022 Gross churn rate: ${p.churn_rate}%
\u2022 Operating expense growth: ${p.opex_growth}%
\u2022 Cash runway at plan spend: ${p.cash_runway_months} months

Note: The Forecast Model tab lets you adjust growth rate, gross margin, and opex growth \u2014 outputs recalculate live. Use it to stress-test management's base case against the data room evidence.`,
        table: { hist: p.hist, q3_revenue_growth: p.q3_revenue_growth, gross_margin: p.gross_margin }
      },
      // ── 3. Churn Update ───────────────────────────────────────────────────
      {
        id: "churn_update",
        title: "Churn_Update.pdf",
        tag: "Churn",
        kind: "pdf",
        body: `CHURN UPDATE \u2014 ${p.company} Customer Health Report (Q2 2025)

GROSS CHURN: ${p.churn_rate}% annually (${round1(p.churn_rate / 4)}% quarterly)
Note: Gross churn is measured at the account level. Net revenue retention is not broken out in this extract.

PLAN MATH CHECK (internal FP&A working note)
Management's ${p.q3_revenue_growth}% revenue growth target sits ${round1(p.q3_revenue_growth - p.sector_growth_high)}\u2013${round1(p.q3_revenue_growth - p.sector_growth_low)} pp above outdoor/B2B market growth of ${p.sector_growth_low}\u2013${p.sector_growth_high}%.

With ${p.churn_rate}% gross churn, reaching ${p.q3_revenue_growth}% net revenue growth requires expansion revenue (upsell + cross-sell) and new logos to more than offset attrition. The plan does not explicitly show this pipeline build.

PEER BENCHMARKS
Peer group average gross churn: ~${p.industry_churn_avg}%
Implication: ${p.company} is running ${round1(p.churn_rate - p.industry_churn_avg)} pp above peer-average gross churn while targeting above-market growth.

PLANTED CONCERN 1: Is the ${p.q3_revenue_growth}% growth target achievable given the ${p.churn_rate}% gross churn rate? Do not assert the answer \u2014 verify the pipeline.`
      },
      // ── 4. Hiring Plan ────────────────────────────────────────────────────
      {
        id: "hiring_plan",
        title: "Hiring_Plan.xlsx",
        tag: "Hiring",
        kind: "xlsx",
        body: `HIRING PLAN \u2014 ${p.company} ${p.quarter}

Q3 PROPOSED HEADCOUNT ADDITIONS
Role	Count	Start Month	Ramp (days)	Revenue Contribution
AE (Enterprise)	3	July	${p.new_hire_ramp_days}	Q3 pipeline assumed
AE (Mid-Market)	2	July	${p.new_hire_ramp_days}	Q3 pipeline assumed
SDR	2	July	${p.new_hire_ramp_days}	Q3 pipeline assumed
Marketing Manager	1	August	${p.new_hire_ramp_days}	Demand gen support

PLAN ASSUMPTIONS
\u2022 Sales cycle length: ${p.sales_cycle_days} days
\u2022 Ramp-to-productivity: ${p.new_hire_ramp_days} days
\u2022 Revenue contribution window: Q3 (assumed, based on July start + ${p.new_hire_ramp_days}-day ramp)
\u2022 Q3 hiring cost impact: increases opex by ~${round1(p.opex_growth - 12)}pp above revenue growth

MATH CHECK (internal): A ${p.new_hire_ramp_days}-day ramp + ${p.sales_cycle_days}-day cycle = ${p.new_hire_ramp_days + p.sales_cycle_days} days until first closed deal.
July start + ${p.new_hire_ramp_days + p.sales_cycle_days} days = ${dateOffset("July 1 2025", p.new_hire_ramp_days + p.sales_cycle_days)}.

PLANTED CONCERN 3 (only visible after Manager Update): If the sales cycle extends by 30 days, the math becomes ${p.new_hire_ramp_days}-day ramp + ${p.updated_sales_cycle_days}-day cycle = ${p.new_hire_ramp_days + p.updated_sales_cycle_days} days. Q3 hires will not generate Q3 revenue.`,
        table: {
          sales_cycle: p.sales_cycle_days,
          ramp: p.new_hire_ramp_days,
          updated_cycle: p.updated_sales_cycle_days
        }
      },
      // ── 5. Customer Concentration Note ───────────────────────────────────
      {
        id: "concentration_note",
        title: "Customer_Concentration.pdf",
        tag: "Customers",
        kind: "pdf",
        body: `CUSTOMER CONCENTRATION NOTE \u2014 ${p.company} Enterprise Account Summary

CONCENTRATION SNAPSHOT
Top-2 enterprise accounts: ~${p.at_risk_arr_pct}% of total ARR
Top-10 accounts: estimated 55\u201365% of total ARR
Peer-average top-10 concentration for comparable B2B firms: 40\u201350%

${p.company} is more concentrated than peers. Two of its largest accounts are approaching renewal this quarter.

RENEWAL STATUS
Account A (enterprise, multi-year): Contract expires Q3 2025. Renewal decision pending.
Account B (enterprise, strategic): Annual renewal Q3 2025. Procurement review in progress.

NOTE: ARR breakdown by account is NOT included in this document.
The VP Sales team holds the detailed account-level ARR data. Do not estimate specific renewal revenue impact without verifying with account managers.

PEER BENCHMARKS
${peerRows}

AMBIGUITY FLAG: The ${p.at_risk_arr_pct}% concentration figure is visible here, but the ARR amounts for Account A and Account B are not. Any specific dollar impact should be flagged as an estimate pending account manager confirmation.`,
        table: { at_risk_arr_pct: p.at_risk_arr_pct, at_risk_count: p.at_risk_customer_count }
      }
    ];
  }
  function round1(n) {
    return Math.round(n * 10) / 10;
  }
  function dateOffset(startStr, days) {
    try {
      const d = new Date(startStr);
      d.setDate(d.getDate() + days);
      return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    } catch (e) {
      return `~${days} days from July 1`;
    }
  }
  var PLANTED_ERRORS = [
    {
      id: "err_growth_churn_mismatch",
      title: "Revenue growth vs. churn rate",
      description: `${12}% revenue growth with ${7}% gross churn requires significant net expansion or new logo pipeline not shown in the plan. Detection requires flagging the churn/growth math in risks, memo, or an assumption that questions the growth premise.`
    },
    {
      id: "err_opex_margin_compression",
      title: "Opex growth vs. revenue growth",
      description: "Operating expenses growing 18% while revenue grows 12% will compress EBITDA margins by ~3-4pp. The plan treats margins as stable. Detection requires flagging the divergence in risks, memo, or adjusting the model to reflect compression."
    },
    {
      id: "err_ramp_sales_cycle_mismatch",
      title: "Hire ramp vs. extended sales cycle",
      description: "After the VP Sales update (+30 days on sales cycle), Q3 new hires cannot contribute Q3 revenue (30-day ramp + 75-day cycle = 105 days). The hiring plan revenue uplift should shift to Q4. Detection requires noting this conflict in risks or assumptions after the manager update fires."
    }
  ];
  var AMBIGUITY_POINT = {
    id: "amb_at_risk_arr",
    title: "At-risk customer ARR unknown",
    description: 'Manager update flags two enterprise renewals as at risk but does not provide ARR breakdown. Good: note the data gap and list requesting ARR detail as a verification step. Poor: state a specific revenue impact (e.g., "$2.3M ARR at risk") as fact without verifying with account managers.'
  };
  function synergyDoubleCountNote(p) {
    const q3_rev_projected = round1(p.q2_revenue * (1 + p.q3_revenue_growth / 100));
    const opex_ratio = round1(p.opex_growth / p.q3_revenue_growth);
    return `CASH RUNWAY & OPEX STRESS \u2014 review carefully
Current cash runway: ${p.cash_runway_months} months at plan spend.
Q3 opex growth: ${p.opex_growth}% vs revenue growth ${p.q3_revenue_growth}% (ratio ${opex_ratio}x \u2014 expenses growing faster than revenue).
If Q3 revenue misses plan by 3pp (${round1(p.q3_revenue_growth - 3)}% actual), EBITDA loss widens and runway shortens.
At-risk enterprise renewals (~${p.at_risk_arr_pct}% of ARR) could accelerate the runway problem if lost.
Detection: flag the opex/revenue divergence and model a downside scenario before approving the hiring plan.`;
  }

  // js/sim/meridian/chatMachine.ts
  var GENERIC_REJECT = /^(ok|okay|sure|yes|no|n\/a|na|k|thanks|thank you|yep|yeah)\.?$/i;
  function isSubstantiveReply(text) {
    const t = String(text || "").trim();
    if (t.length < 15) return false;
    if (GENERIC_REJECT.test(t)) return false;
    return true;
  }
  function hasRepliedToD1AndSubstantive(session) {
    if (!session.d1_fired) return true;
    return isSubstantiveReply(session.d1_reply_text || "");
  }
  function already(session, id) {
    return (session.used_trigger_ids || []).includes(id);
  }
  function mark(session, id) {
    if (!session.used_trigger_ids) session.used_trigger_ids = [];
    if (!session.used_trigger_ids.includes(id)) session.used_trigger_ids.push(id);
  }
  function pushMsg(session, msg) {
    const full = {
      id: msg.id || `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ...msg
    };
    if (!session.chatMessages) session.chatMessages = [];
    if (session.chatMessages.some((m) => m.body === full.body)) return full;
    session.chatMessages.push(full);
    return full;
  }
  function tickChatTriggers(session) {
    var _a, _b, _c, _d;
    const out = [];
    const elapsed = session._elapsedSec || 0;
    const modelSec = ((_a = session.tabSeconds) == null ? void 0 : _a.financials) || ((_b = session.tabSeconds) == null ? void 0 : _b.Financials) || 0;
    const opened = session.openedDocs || [];
    const assumptions = (session.assumptionTexts || []).join(" ").toLowerCase();
    if (!already(session, "C1") && elapsed >= 90) {
      mark(session, "C1");
      out.push(
        pushMsg(session, {
          triggerId: "C1",
          sender: "casey",
          name: "Casey Park",
          role: "Finance Analyst",
          body: "Quick heads-up \u2014 the Churn Update doc has some interesting math on growth vs. attrition that might affect how you read the revenue forecast. Worth a look before you stress-test the model.",
          elapsedSec: elapsed
        })
      );
    }
    if (!already(session, "C2") && modelSec >= 240 && !opened.includes("churn_update")) {
      mark(session, "C2");
      out.push(
        pushMsg(session, {
          triggerId: "C2",
          sender: "casey",
          name: "Casey Park",
          role: "Finance Analyst",
          body: "Are you cross-checking against the Churn Update? The growth target makes a lot of assumptions about how much attrition the new logo pipeline has to overcome. It's in the data room if you haven't pulled it.",
          elapsedSec: elapsed
        })
      );
    }
    if (!already(session, "C3") && /growth|margin|opex|churn/.test(assumptions)) {
      mark(session, "C3");
      out.push(
        pushMsg(session, {
          triggerId: "C3",
          sender: "casey",
          name: "Casey Park",
          role: "Finance Analyst",
          body: "Saw you're logging assumptions on growth or margins \u2014 want me to pull the Q2 actuals breakdown? Happy to sanity-check the numbers before you finalize.",
          elapsedSec: elapsed
        })
      );
    }
    const risksOpened = !!(((_c = session.tabSeconds) == null ? void 0 : _c.risks) || ((_d = session.tabSeconds) == null ? void 0 : _d.Risks));
    if (!already(session, "C4") && elapsed >= 15 * 60 && !risksOpened) {
      mark(session, "C4");
      out.push(
        pushMsg(session, {
          triggerId: "C4",
          sender: "casey",
          name: "Casey Park",
          role: "Finance Analyst",
          body: "Just flagging \u2014 have you looked at the Customer Concentration note? The enterprise renewal situation seems relevant before you sign off on the hiring budget.",
          elapsedSec: elapsed
        })
      );
    }
    if (!already(session, "C5") && session.submitted) {
      mark(session, "C5");
      const cat = session.recommendation_category || "your call";
      out.push(
        pushMsg(session, {
          triggerId: "C5",
          sender: "casey",
          name: "Casey Park",
          role: "Finance Analyst",
          body: `Nice work \u2014 I thought ${cat} made sense given what the data was showing. The churn math alone would have given me pause on the original plan.`,
          elapsedSec: elapsed
        })
      );
    }
    if (!already(session, "A1") && elapsed >= 8 * 60) {
      mark(session, "A1");
      session.d1_fired = true;
      out.push(
        pushMsg(session, {
          triggerId: "A1",
          sender: "alex",
          name: "Alex Kim",
          role: "CFO",
          body: "Before you finalize: what's your single biggest concern about the Q3 plan? I want your honest read \u2014 reply here when you have a view.",
          elapsedSec: elapsed,
          needsReply: true
        })
      );
    }
    if (!already(session, "J1") && elapsed >= 12 * 60) {
      mark(session, "J1");
      out.push(
        pushMsg(session, {
          triggerId: "J1",
          sender: "jordan",
          name: "Jordan Lee",
          role: "VP Sales",
          body: "Heads-up from my end before you wrap the forecast review: just came off a call with two of our largest enterprise accounts. Both have flagged extended procurement timelines \u2014 I'd add 30 days to your sales cycle assumption. Also treating both renewals as at-risk until their procurement teams confirm. Worth factoring into whatever you're recommending on the hiring side.",
          elapsedSec: elapsed
        })
      );
    }
    const win = session.aiAskCountWindow || { t: 0, count: 0 };
    if (!already(session, "J2") && win.count >= 2 && elapsed - win.t <= 90) {
      mark(session, "J2");
      out.push(
        pushMsg(session, {
          triggerId: "J2",
          sender: "jordan",
          name: "Jordan Lee",
          role: "VP Sales",
          body: "No issue with using the AI tools \u2014 just make sure you're checking what it outputs against the actual data room figures before it goes in the recommendation. I've seen it miss context.",
          elapsedSec: elapsed
        })
      );
    }
    return out;
  }
  function handleCandidateChatReply(session, text) {
    const body = String(text || "").trim();
    const elapsed = session._elapsedSec || 0;
    if (session.d1_fired && !isSubstantiveReply(session.d1_reply_text || "")) {
      if (!isSubstantiveReply(body)) {
        return {
          accepted: false,
          rejectReason: "Give me a bit more than that \u2014 what specifically worries you about the plan?"
        };
      }
      session.d1_reply_text = body;
      pushMsg(session, {
        triggerId: "A1_reply",
        sender: "candidate",
        name: "You",
        role: "Candidate",
        body,
        elapsedSec: elapsed,
        isReply: true
      });
      const lower = body.toLowerCase();
      let follow;
      let branch;
      if (/churn|retention|attrition|growth.*gap/.test(lower)) {
        branch = "churn";
        follow = "That's the one I keep coming back to too. Make sure the memo is explicit about what the pipeline math requires \u2014 not just that churn is a risk, but what it means for the growth target.";
      } else if (/opex|margin|compress|expense/.test(lower)) {
        branch = "margin";
        follow = "Fair call. If you're flagging margin compression, show me the numbers \u2014 how many pp of margin are we talking? That changes the hiring conversation.";
      } else if (/cash|runway|burn/.test(lower)) {
        branch = "cash";
        follow = "Good instinct. 9 months is tight if Q3 revenue misses. Make sure your recommendation reflects what happens to runway in the downside case.";
      } else if (/renewal|customer|concentration|enterprise/.test(lower)) {
        branch = "customer";
        follow = "Agreed. The enterprise concentration is real. Make sure you're specific in the memo about what you'd verify before approving the hiring.";
      } else {
        branch = "generic";
        follow = "Okay \u2014 make sure that concern shows up clearly in your VP Memo. I'll be reading for it.";
      }
      session.d1_branch = branch;
      if (!already(session, "A1_follow")) {
        mark(session, "A1_follow");
        const followUp = pushMsg(session, {
          triggerId: "A1_follow",
          sender: "alex",
          name: "Alex Kim",
          role: "CFO",
          body: follow,
          elapsedSec: elapsed
        });
        return { accepted: true, followUp, branch };
      }
      return { accepted: true, branch };
    }
    pushMsg(session, {
      triggerId: "candidate_msg",
      sender: "candidate",
      name: "You",
      role: "Candidate",
      body,
      elapsedSec: elapsed,
      isReply: true
    });
    return { accepted: true };
  }
  function recordAiAsk(session) {
    const t = session._elapsedSec || 0;
    if (!session.aiAskCountWindow || t - session.aiAskCountWindow.t > 90) {
      session.aiAskCountWindow = { t, count: 1 };
    } else {
      session.aiAskCountWindow.count += 1;
    }
  }

  // js/sim/meridian/ai.ts
  function asksRevenueGrowth(prompt) {
    const p = prompt.toLowerCase();
    return /revenue.*growth|growth.*target|growth.*forecast|q3.*growth|forecast.*growth|growth.*rate|revenue.*plan/.test(p);
  }
  function asksChurnCheck(prompt) {
    const p = prompt.toLowerCase();
    return /churn|retention|net.*retention|gross.*retention|attrition|customer.*health/.test(p);
  }
  function askMeridianAI(session, params, prompt) {
    recordAiAsk(session);
    const trap = asksRevenueGrowth(prompt) && !asksChurnCheck(prompt);
    let response;
    if (trap) {
      response = `${params.q3_revenue_growth}% Q3 revenue growth is consistent with the ${params.company} plan and the Q2 momentum visible in the historical data. The hiring investment in Sales and Marketing supports the growth case, and the plan is within the range seen in comparable outdoor/B2B businesses. Use ${params.q3_revenue_growth}% as your base case unless you identify a specific downside driver.`;
    } else if (asksChurnCheck(prompt) || /churn|attrition/.test(prompt.toLowerCase())) {
      response = `Gross churn at ${params.churn_rate}% is above the peer average of ~${params.industry_churn_avg}%. To hit ${params.q3_revenue_growth}% net revenue growth from a ${params.churn_rate}% gross churn base, you need strong expansion revenue and/or new logo pipeline that offsets attrition. The plan should show that math explicitly \u2014 if it doesn't, that's a flag.`;
    } else if (/opex|margin|compress|expense/.test(prompt.toLowerCase())) {
      response = `Opex growing at ${params.opex_growth}% versus ${params.q3_revenue_growth}% revenue growth means EBITDA margin compression of roughly ${Math.round((params.opex_growth - params.q3_revenue_growth) / 2)}pp. The plan should reflect that \u2014 if the margin line looks flat, the model hasn't accounted for the cost growth. Adjust the gross margin input down to reflect the real squeeze before finalizing.`;
    } else if (/sales.*cycle|cycle|ramp/.test(prompt.toLowerCase())) {
      response = `With a ${params.sales_cycle_days}-day sales cycle and ${params.new_hire_ramp_days}-day ramp, July hires can contribute deals closed by around day ${params.sales_cycle_days + params.new_hire_ramp_days}. If the sales cycle extends at all \u2014 say by 30 days \u2014 that math shifts meaningfully and Q3 hires might not close anything until Q4.`;
    } else if (/cash|runway|burn/.test(prompt.toLowerCase())) {
      response = `${params.cash_runway_months} months runway at plan spend is tight. If Q3 revenue misses by 3+ pp, runway shortens materially. The two at-risk enterprise renewals add another layer of uncertainty \u2014 flag the downside scenario in your recommendation.`;
    } else if (/hire|hiring|headcount/.test(prompt.toLowerCase())) {
      response = `The hiring plan adds 8 net new sales and marketing FTEs in Q3. The key assumption is that ${params.sales_cycle_days}-day cycle + ${params.new_hire_ramp_days}-day ramp allows Q3 revenue contribution. If anything stretches that timeline \u2014 like a sales cycle extension \u2014 the Q3 revenue case for the new hires evaporates.`;
    } else {
      response = `Focus on three things: (1) whether the ${params.q3_revenue_growth}% growth target is achievable given ${params.churn_rate}% gross churn, (2) whether opex growth at ${params.opex_growth}% is sustainable versus ${params.q3_revenue_growth}% revenue, and (3) whether Q3 hires can realistically contribute Q3 revenue given the sales cycle. Cross-reference the Churn Update and Hiring Plan with the Forecast Model.`;
    }
    const event = {
      id: `ai_${Date.now().toString(36)}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      prompt_text: prompt,
      ai_response_summary: response.slice(0, 280),
      candidate_action_after: "unknown",
      trap_triggered: trap,
      trap_caught: null
    };
    if (!session.ai_usage_log) session.ai_usage_log = [];
    session.ai_usage_log.push(event);
    return { response, trap_triggered: trap, event };
  }
  function finalizeAiUsage(session, params) {
    var _a;
    const corpusText2 = [
      session.finalMemo || "",
      ...(session.assumptions || []).map((a) => `${a.title || ""} ${a.text || ""}`),
      ...(session.risks || []).map((r) => `${r.category || ""} ${r.title || ""} ${r.text || ""}`)
    ].join("\n").toLowerCase();
    const caughtChurn = !!((_a = session.plantedErrorFlags) == null ? void 0 : _a.err_growth_churn_mismatch) || /churn|attrition|net.*retention/.test(corpusText2) && /growth|target|forecast/.test(corpusText2);
    for (const ev of session.ai_usage_log || []) {
      if (ev.trap_triggered) {
        ev.trap_caught = caughtChurn;
      }
      const snippet = (ev.ai_response_summary || "").slice(0, 40).toLowerCase();
      if (snippet && corpusText2.includes(snippet.slice(0, 24))) {
        ev.candidate_action_after = "accepted_as_is";
      } else if (ev.trap_triggered && caughtChurn) {
        ev.candidate_action_after = "edited";
      } else if (ev.trap_triggered && !caughtChurn && corpusText2.includes(String(params.q3_revenue_growth))) {
        ev.candidate_action_after = "accepted_as_is";
      } else {
        ev.candidate_action_after = corpusText2.length > 40 ? "edited" : "rejected";
      }
    }
  }

  // js/sim/meridian/gates.ts
  function getMeridianMissingRequirements(session) {
    const missing = [];
    if (!session._briefViewed) {
      missing.push({ id: "brief", label: "View the CFO Brief", blocking: true });
    }
    const docs = session.openedDocs || [];
    if (docs.length < 2) {
      missing.push({
        id: "docs",
        label: `Open at least 2 Data Room documents (${docs.length}/2)`,
        blocking: true
      });
    }
    if (!session._financialsViewed || !session._valuationAdjusted) {
      missing.push({
        id: "financials",
        label: "View the Forecast Model and adjust at least one assumption",
        blocking: true
      });
    }
    if (!(session.assumptions && session.assumptions.length >= 1)) {
      missing.push({ id: "assumption", label: "Log at least 1 assumption", blocking: true });
    }
    if (!(session.risks && session.risks.some((r) => (r.text || "").trim().length >= 8))) {
      missing.push({ id: "risk", label: "Flag at least 1 risk with elaboration", blocking: true });
    }
    if (session.d1_fired && !hasRepliedToD1AndSubstantive(session)) {
      missing.push({
        id: "d1",
        label: "Reply substantively to Alex Kim's question (15+ characters)",
        blocking: true
      });
    }
    if ((session.used_trigger_ids || []).includes("J1") && !session.m1_acknowledged) {
      missing.push({
        id: "m1",
        label: "Acknowledge VP Sales update: address the sales cycle extension and at-risk renewals in your risks or assumptions",
        blocking: false
      });
    }
    const rec = session.recommendation || {};
    if (!rec.category) {
      missing.push({ id: "rec_cat", label: "Select a recommendation (Go / Hold / Revise)", blocking: true });
    }
    if (!(rec.reason1 || "").trim() || !(rec.reason2 || "").trim() || !(rec.reason3 || "").trim()) {
      missing.push({ id: "rec_reasons", label: "Fill all three key reasons", blocking: true });
    }
    if (!(session.risks && session.risks.length)) {
      missing.push({ id: "rec_risks", label: "Risks must be present on the recommendation", blocking: true });
    }
    if (!(session.assumptions && session.assumptions.length)) {
      missing.push({
        id: "rec_assumptions",
        label: "Assumptions must be present on the recommendation",
        blocking: true
      });
    }
    if ((rec.diligence || "").trim().length < 40) {
      missing.push({
        id: "diligence",
        label: "Verification steps must be at least 40 characters",
        blocking: true
      });
    }
    return missing;
  }
  function canSubmitMeridian(session) {
    return getMeridianMissingRequirements(session).every((m) => !m.blocking);
  }
  function calculateMeridianProgress(session) {
    var _a, _b;
    if (session.submitted) return 100;
    let p = 5;
    if (session._briefViewed) p += 10;
    if ((session.openedDocs || []).length >= 2) p += 15;
    if (session._valuationAdjusted) p += 10;
    if ((session.assumptions || []).length >= 1) p += 15;
    if ((session.risks || []).length >= 1) p += 15;
    if (hasRepliedToD1AndSubstantive(session) && session.d1_fired) p += 10;
    else if (!session.d1_fired && (session.chatMessages || []).some((m) => m.sender === "candidate")) p += 5;
    if ((_a = session.recommendation) == null ? void 0 : _a.category) p += 5;
    if ((((_b = session.recommendation) == null ? void 0 : _b.diligence) || "").length >= 40) p += 10;
    return Math.min(95, p);
  }
  function getStageCompletion(session) {
    var _a, _b;
    return {
      brief: !!session._briefViewed,
      analyze: (session.openedDocs || []).length >= 2,
      build: !!(session._valuationAdjusted && (session.assumptions || []).length >= 1),
      recommend: !!(((_a = session.recommendation) == null ? void 0 : _a.category) && (session.risks || []).length >= 1 && (((_b = session.recommendation) == null ? void 0 : _b.diligence) || "").length >= 40),
      submit: !!session.submitted
    };
  }

  // js/sim/content/rubrics/communication.v1.json
  var communication_v1_default = {
    id: "communication.v1",
    dimension: "Communication Clarity",
    version: "2.0.0",
    context: "FP&A Forecast Review \u2014 VP Finance memo on Q3 hiring/marketing plan",
    anchors: {
      strong: "Revise. The 12% growth target is not credible at 7% gross churn without an explicit pipeline build \u2014 the plan shows neither the expansion revenue nor the new logo math required to offset attrition. Opex at 18% growth vs 12% revenue will compress EBITDA margin ~3pp; the plan treats margin as flat. After the VP Sales update (sales cycle +30 days), Q3 hires cannot contribute Q3 revenue \u2014 the hiring revenue uplift belongs in Q4. Verify: (1) ARR breakdown for two at-risk enterprise renewals with account managers, (2) net retention math behind the growth target, (3) updated hiring plan with Q4 pipeline contribution.",
      weak: "Go. Strong franchise with experienced management. Synergies will be realized and the plan represents a compelling opportunity for the business to unlock value for shareholders."
    },
    rubric_prompt: "Score communication clarity 0-100. Require JSON {score, rationale, quoted_evidence}. Strong = recommendation stated up front, three distinct non-redundant reasons with specific numbers (%, days, $), no vague corporate language. Weak = vague language, no clear call, no specific metrics.",
    required_elements: ["clear_recommendation", "distinct_reasons", "specific_language", "verification_steps"]
  };

  // js/sim/meridian/evaluate.ts
  function corpus(session) {
    var _a, _b, _c, _d;
    return [
      session.finalMemo || "",
      (_a = session.recommendation) == null ? void 0 : _a.reason1,
      (_b = session.recommendation) == null ? void 0 : _b.reason2,
      (_c = session.recommendation) == null ? void 0 : _c.reason3,
      (_d = session.recommendation) == null ? void 0 : _d.diligence,
      session.d1_reply_text,
      ...(session.assumptions || []).map((a) => a.text),
      ...(session.risks || []).map((r) => `${r.category} ${r.text}`)
    ].filter(Boolean).join("\n").toLowerCase();
  }
  function detectError1(session) {
    var _a, _b, _c, _d, _e, _f;
    const text = corpus(session);
    const openedChurn = (session.openedDocs || []).includes("churn_update");
    const flaggedRisk = (session.risks || []).find(
      (r) => /churn|net.*retention|gross.*retention|attrition|growth.*gap|growth.*require|pipeline/.test(
        `${r.category} ${r.text}`.toLowerCase()
      )
    );
    const flaggedAssumption = (session.assumptions || []).find(
      (a) => /churn|net.*retention|gross.*retention|attrition|growth.*require|pipeline/i.test(a.text)
    );
    const inMemo = /churn.*growth|growth.*churn|attrition.*growth|net.*retention.*target|pipeline.*offset/.test(text);
    const evidence = [];
    if (openedChurn) evidence.push("Opened Churn_Update.pdf");
    if (flaggedRisk) evidence.push(`Risk: [${flaggedRisk.category}] ${flaggedRisk.text}`);
    if (flaggedAssumption) evidence.push(`Assumption: ${flaggedAssumption.text}`);
    if (inMemo) evidence.push("Memo/text addresses churn vs. growth math");
    if ((_a = session.plantedErrorFlags) == null ? void 0 : _a.err_growth_churn_mismatch) evidence.push("Session flag: err_growth_churn_mismatch");
    const caught = evidence.length > 0 && (flaggedRisk !== void 0 || flaggedAssumption !== void 0 || ((_b = session.plantedErrorFlags) == null ? void 0 : _b.err_growth_churn_mismatch) || inMemo);
    if (caught) return { status: "caught", evidence };
    return {
      status: "missed",
      evidence: [
        `No risk/assumption/memo evidence linking ${(_d = (_c = session.params) == null ? void 0 : _c.churn_rate) != null ? _d : 7}% gross churn to the ${(_f = (_e = session.params) == null ? void 0 : _e.q3_revenue_growth) != null ? _f : 12}% revenue growth target`
      ]
    };
  }
  function detectError2(session) {
    var _a, _b, _c, _d, _e, _f, _g;
    const text = corpus(session);
    const params = session.params;
    const flaggedRisk = (session.risks || []).find(
      (r) => /opex|margin.*compres|operating.*expense|expense.*faster|compress|squeeze/.test(
        `${r.category} ${r.text}`.toLowerCase()
      )
    );
    const flaggedAssumption = (session.assumptions || []).find(
      (a) => /opex|margin.*compres|operating.*expense.*revenue|expense.*faster|18.*12|faster.*revenue/i.test(a.text)
    );
    const modelLowered = session.valuation !== void 0 && params !== void 0 && session.valuation.exit_multiple <= params.gross_margin - 2;
    const inMemo = /opex.*revenue|margin.*compres|18.*12|expense.*grow.*faster|ebitda.*shrink/.test(text);
    const evidence = [];
    if (flaggedRisk) evidence.push(`Risk: [${flaggedRisk.category}] ${flaggedRisk.text}`);
    if (flaggedAssumption) evidence.push(`Assumption: ${flaggedAssumption.text}`);
    if (modelLowered) evidence.push(`Model: gross margin adjusted down to ${(_a = session.valuation) == null ? void 0 : _a.exit_multiple}% (plan: ${params == null ? void 0 : params.gross_margin}%)`);
    if (inMemo) evidence.push("Memo/text addresses opex vs. revenue divergence");
    if ((_b = session.plantedErrorFlags) == null ? void 0 : _b.err_opex_margin_compression) evidence.push("Session flag: err_opex_margin_compression");
    const caught = evidence.length > 0 && (flaggedRisk !== void 0 || flaggedAssumption !== void 0 || modelLowered || ((_c = session.plantedErrorFlags) == null ? void 0 : _c.err_opex_margin_compression) || inMemo);
    if (caught) return { status: "caught", evidence };
    return {
      status: "missed",
      evidence: [
        `No evidence of noting ${(_e = (_d = session.params) == null ? void 0 : _d.opex_growth) != null ? _e : 18}% opex growth vs ${(_g = (_f = session.params) == null ? void 0 : _f.q3_revenue_growth) != null ? _g : 12}% revenue growth \u2014 EBITDA margin compression not flagged`
      ]
    };
  }
  function detectError3(session) {
    var _a, _b;
    const text = corpus(session);
    const m1Fired = session.m1_fired || (session.used_trigger_ids || []).includes("J1");
    const flaggedRisk = (session.risks || []).find(
      (r) => /ramp|sales.*cycle.*ext|cycle.*ext|75.*day|q4.*hire|hire.*q4|hire.*contribut|no.*q3.*rev/.test(
        `${r.category} ${r.text}`.toLowerCase()
      )
    );
    const flaggedAssumption = (session.assumptions || []).find(
      (a) => /ramp|sales.*cycle.*ext|cycle.*extend|75.*day|q[34].*revenue|hire.*contribut/i.test(a.text)
    );
    const inMemo = /ramp.*cycle|cycle.*ramp|75.*day|cycle.*extend.*hire|hire.*revenue.*q[34]/.test(text);
    const anticipatedEarly = /ramp.*sales.*cycle|sales.*cycle.*ramp|hire.*pipeline|75.*day/.test(text) && !m1Fired;
    const evidence = [];
    if (m1Fired) evidence.push("Manager update received: VP Sales flagged sales cycle +30 days, 2 at-risk renewals");
    if (flaggedRisk) evidence.push(`Risk: [${flaggedRisk.category}] ${flaggedRisk.text}`);
    if (flaggedAssumption) evidence.push(`Assumption: ${flaggedAssumption.text}`);
    if (inMemo) evidence.push("Memo/text addresses ramp vs. extended sales cycle");
    if ((_a = session.plantedErrorFlags) == null ? void 0 : _a.err_ramp_sales_cycle_mismatch) evidence.push("Session flag: err_ramp_sales_cycle_mismatch");
    if (anticipatedEarly) evidence.push("Candidate anticipated ramp/cycle conflict before manager update");
    const caught = ((_b = session.plantedErrorFlags) == null ? void 0 : _b.err_ramp_sales_cycle_mismatch) || anticipatedEarly || m1Fired && (flaggedRisk !== void 0 || flaggedAssumption !== void 0 || inMemo);
    if (caught) return { status: "caught", evidence: evidence.length ? evidence : ["Caught via plantedErrorFlags"] };
    if (!m1Fired) {
      return {
        status: "missed",
        evidence: ["VP Sales manager update not received \u2014 ramp/cycle extension could not be detected"]
      };
    }
    return {
      status: "missed",
      evidence: [
        "Manager update received but candidate did not note that extended sales cycle (75 days) + ramp (30 days) = Q3 hires cannot contribute Q3 revenue"
      ]
    };
  }
  function scoreAmbiguity2(session) {
    var _a, _b;
    const diligence = (((_a = session.recommendation) == null ? void 0 : _a.diligence) || "").toLowerCase();
    const memo = (session.finalMemo || "").toLowerCase();
    const text = `${diligence}
${memo}`;
    const openedConcentration = (session.openedDocs || []).includes("concentration_note");
    const requestsAtRiskData = /request.*arr|arr.*request|verify.*renewal|confirm.*account|arr.*breakdown|account.*arr|at.?risk.*arr.*unknown|unknown.*at.?risk|get.*arr|confirm.*arr/i.test(
      text
    );
    const inventsFact = /\$\d+(\.\d+)?\s*(m|million|k|b)\s*(arr|at.?risk|renewal|customer)|lose \d+%\s*(arr|revenue)|impact.*\$\d+/i.test(
      text
    ) && !openedConcentration;
    if (requestsAtRiskData) {
      return {
        dimension: "Ambiguity handling",
        score: "good",
        label: "Good pattern",
        rationale: "Candidate noted the at-risk ARR gap and/or listed requesting ARR breakdown from account managers in verification steps.",
        evidence: [diligence.slice(0, 200) || memo.slice(0, 200)],
        method: "deterministic"
      };
    }
    if (inventsFact) {
      return {
        dimension: "Ambiguity handling",
        score: "poor",
        label: "Poor pattern",
        rationale: "Candidate stated a specific revenue/ARR impact for at-risk customers without verifying the ARR breakdown with account managers or opening the concentration note.",
        evidence: [text.slice(0, 220)],
        method: "deterministic"
      };
    }
    if (!(((_b = session.recommendation) == null ? void 0 : _b.diligence) || "").trim()) {
      return {
        dimension: "Ambiguity handling",
        score: "insufficient_data",
        rationale: "No verification steps text to classify ambiguity handling.",
        evidence: [],
        method: "deterministic"
      };
    }
    return {
      dimension: "Ambiguity handling",
      score: "insufficient_data",
      rationale: "Verification steps present but neither clearly requests at-risk ARR data nor invents a specific revenue figure.",
      evidence: [diligence.slice(0, 200)],
      method: "deterministic"
    };
  }
  function scoreModelingDiscipline(session) {
    var _a, _b;
    const v = session.valuation;
    if (!v) {
      return {
        dimension: "Modeling Discipline",
        score: "insufficient_data",
        rationale: "No forecast model adjustment recorded.",
        evidence: [],
        method: "deterministic"
      };
    }
    const params = session.params;
    const evidence = [
      `Model inputs submitted: revenue growth ${v.growth_rate}%, gross margin ${v.exit_multiple}%, opex growth ${(_b = (_a = v.discount_rate) != null ? _a : params == null ? void 0 : params.opex_growth) != null ? _b : 18}%`,
      `Plan defaults: growth ${params == null ? void 0 : params.q3_revenue_growth}%, GM ${params == null ? void 0 : params.gross_margin}%, opex ${params == null ? void 0 : params.opex_growth}%`
    ];
    let score = 40;
    if (params && v.growth_rate < params.q3_revenue_growth - 1) {
      score += 20;
      evidence.push("Growth input lowered below plan \u2014 candidate stress-tested");
    }
    if (params && v.exit_multiple < params.gross_margin - 1) {
      score += 20;
      evidence.push("Gross margin input lowered below plan \u2014 candidate reflected compression");
    }
    if (params && v.discount_rate !== void 0 && v.discount_rate > params.opex_growth) {
      score += 15;
      evidence.push("Opex growth input raised above plan \u2014 conservative scenario tested");
    }
    if (params && Math.abs(v.growth_rate - params.q3_revenue_growth) < 0.1 && Math.abs(v.exit_multiple - params.gross_margin) < 0.1) {
      score = Math.max(10, score - 30);
      evidence.push("Model left unchanged from plan defaults \u2014 no stress-test performed");
    }
    return {
      dimension: "Modeling Discipline",
      score: Math.min(100, score),
      rationale: "Extent to which candidate adjusted forecast model inputs to reflect identified risks.",
      evidence,
      method: "deterministic"
    };
  }
  function scoreAssumptionChecking(session) {
    const list = session.assumptions || [];
    if (!list.length) {
      return {
        dimension: "Assumption Checking",
        score: "insufficient_data",
        rationale: "No assumptions logged.",
        evidence: [],
        method: "deterministic"
      };
    }
    const specific = list.filter(
      (a) => /\d|%|day|week|month|churn|opex|margin|growth|ramp|cycle|arr|revenue/i.test(a.text)
    );
    const score = Math.round(specific.length / list.length * 60 + Math.min(40, list.length * 13));
    return {
      dimension: "Assumption Checking",
      score: Math.min(100, score),
      rationale: `${specific.length}/${list.length} assumptions reference concrete forecast levers (numbers, rates, days, or named metrics).`,
      evidence: list.map((a) => a.text).slice(0, 5),
      method: "deterministic"
    };
  }
  function scoreRiskDetection(session, errors) {
    const risks = session.risks || [];
    if (!risks.length) {
      return {
        dimension: "Risk Detection",
        score: "insufficient_data",
        rationale: "No risks logged.",
        evidence: [],
        method: "deterministic"
      };
    }
    const fpaConcerns = risks.filter(
      (r) => /churn|retention|opex|margin|compres|ramp|cycle|extend|renewal|concentration|runway/i.test(
        `${r.category} ${r.text}`
      )
    );
    const evidence = risks.slice(0, 4).map((r) => `[${r.category}] ${r.text}`);
    const caught = errors.filter((e) => e.status === "caught").length;
    const score = Math.min(100, fpaConcerns.length * 20 + caught * 15);
    return {
      dimension: "Risk Detection",
      score,
      rationale: `${fpaConcerns.length} FP&A-relevant risks logged; ${caught}/3 planted concerns reflected in evaluation.`,
      evidence,
      method: "deterministic"
    };
  }
  function scoreBusinessJudgment(session, errors) {
    var _a, _b, _c;
    const cat = ((_a = session.recommendation) == null ? void 0 : _a.category) || "";
    const caught = errors.filter((e) => e.status === "caught").length;
    const evidence = [`Recommendation: ${cat || "(none)"}`, `Planted concerns caught: ${caught}/3`];
    let score = 40;
    if (!cat) {
      return {
        dimension: "Business Judgment",
        score: "insufficient_data",
        rationale: "No recommendation category submitted.",
        evidence: [],
        method: "deterministic"
      };
    }
    const catLower = cat.toLowerCase();
    if ((catLower === "go" || catLower === "proceed") && caught === 0) {
      score = 15;
      evidence.push("Go/Proceed with no concerns caught \u2014 weak judgment");
    } else if ((catLower === "revise" || catLower === "hold") && caught >= 2) {
      score = 85;
      evidence.push("Revise/Hold recommendation aligns with \u22652 concerns caught");
    } else if ((catLower === "revise" || catLower === "hold") && caught >= 1) {
      score = 70;
      evidence.push("Revise/Hold tied to at least one real concern");
    } else {
      score = 45 + caught * 12;
    }
    const reasons = `${((_b = session.recommendation) == null ? void 0 : _b.reason1) || ""} ${((_c = session.recommendation) == null ? void 0 : _c.reason2) || ""}`.toLowerCase();
    if (/churn|opex|margin|ramp|cycle|renewal|concentration|runway/.test(reasons)) {
      score += 5;
      evidence.push("Reasons reference plan-specific FP&A concerns");
    }
    return {
      dimension: "Business Judgment",
      score: Math.min(100, score),
      rationale: "Alignment between recommendation severity and FP&A concerns caught/missed, plus specificity of reasoning.",
      evidence,
      method: "deterministic"
    };
  }
  function scoreCommunicationClarity(session) {
    var _a, _b, _c, _d;
    const r1 = (((_a = session.recommendation) == null ? void 0 : _a.reason1) || "").trim();
    const r2 = (((_b = session.recommendation) == null ? void 0 : _b.reason2) || "").trim();
    const r3 = (((_c = session.recommendation) == null ? void 0 : _c.reason3) || "").trim();
    const memo = (session.finalMemo || [r1, r2, r3].join(" ")).trim();
    if (!memo || memo.length < 40) {
      return {
        dimension: "Communication Clarity",
        score: "insufficient_data",
        rationale: "Insufficient VP Memo / reasons text for communication scoring.",
        evidence: [],
        method: "heuristic_fallback"
      };
    }
    let score = 40;
    const evidence = [];
    if ((_d = session.recommendation) == null ? void 0 : _d.category) {
      score += 15;
      evidence.push(`Recommendation stated up front: ${session.recommendation.category}`);
    }
    const reasons = [r1, r2, r3].filter(Boolean);
    if (reasons.length === 3) {
      score += 20;
      evidence.push(`Three distinct reasons: "${r1.slice(0, 50)}"; "${r2.slice(0, 50)}"; "${r3.slice(0, 50)}"`);
    }
    const vague = /synergies will be realized|strong franchise|compelling opportunity|unlock value|management.*experienced/i;
    if (vague.test(memo)) {
      score -= 15;
      evidence.push("Contains vague corporate language without specific numbers");
    } else {
      score += 10;
    }
    if (/\d|%|\$|pp\b|days?/.test(memo)) {
      score += 10;
      evidence.push("Uses specific numbers / metrics in memo");
    }
    evidence.push(`Rubric: ${communication_v1_default.id || "communication.v1"}`);
    return {
      dimension: "Communication Clarity",
      score: Math.max(0, Math.min(100, score)),
      rationale: "Clarity of recommendation, three distinct non-redundant reasons, use of specific data.",
      evidence,
      method: "heuristic_fallback"
    };
  }
  function scoreAiVerificationBehavior(session) {
    const aiLog = session.ai_usage_log || [];
    if (!aiLog.length) {
      return {
        dimension: "AI Verification Behavior",
        score: 60,
        label: "Not heavily used",
        rationale: "No AI usage recorded \u2014 neither trap triggered nor blind trust observed.",
        evidence: ["ai_usage_log empty"],
        method: "deterministic"
      };
    }
    const trap = aiLog.find((e) => e.trap_triggered);
    const evidence = aiLog.map(
      (e) => `${e.timestamp}: trap=${e.trap_triggered} caught=${e.trap_caught} action=${e.candidate_action_after} | ${e.prompt_text.slice(0, 80)}`
    );
    if (trap && trap.trap_caught === false) {
      return {
        dimension: "AI Verification Behavior",
        score: 25,
        rationale: "Received AI endorsement of optimistic growth forecast without churn cross-check, and did not subsequently flag the churn/growth mismatch.",
        evidence,
        method: "deterministic"
      };
    }
    if (trap && trap.trap_caught === true) {
      return {
        dimension: "AI Verification Behavior",
        score: 90,
        rationale: "Received AI growth endorsement but verified against churn data and caught the mismatch.",
        evidence,
        method: "deterministic"
      };
    }
    return {
      dimension: "AI Verification Behavior",
      score: 70,
      rationale: "Used AI without triggering the uncritical growth forecast trap path.",
      evidence,
      method: "deterministic"
    };
  }
  function generateInterviewQuestions(errors, session) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    const questions = [];
    const missed = errors.filter((e) => e.status === "missed");
    const caught = errors.filter((e) => e.status === "caught");
    for (const e of missed) {
      if (e.id === "err_growth_churn_mismatch") {
        questions.push(
          `Walk me through how you'd pressure-test a ${(_b = (_a = session.params) == null ? void 0 : _a.q3_revenue_growth) != null ? _b : 12}% revenue growth target when gross churn is running at ${(_d = (_c = session.params) == null ? void 0 : _c.churn_rate) != null ? _d : 7}%. What pipeline math would you need to see?`
        );
      }
      if (e.id === "err_opex_margin_compression") {
        questions.push(
          `If operating expenses grow ${(_f = (_e = session.params) == null ? void 0 : _e.opex_growth) != null ? _f : 18}% but revenue only grows ${(_h = (_g = session.params) == null ? void 0 : _g.q3_revenue_growth) != null ? _h : 12}%, what happens to EBITDA margin? Would you approve the hiring plan anyway?`
        );
      }
      if (e.id === "err_ramp_sales_cycle_mismatch") {
        questions.push(
          `The VP Sales just told you the sales cycle extended by 30 days. You have 8 new hires starting in July with a 30-day ramp. What does that mean for Q3 revenue projections?`
        );
      }
    }
    for (const e of caught) {
      if (e.id === "err_growth_churn_mismatch") {
        questions.push(
          `You flagged the churn/growth tension \u2014 if you were the CFO, what specific change to the Q3 plan would you require before approving it?`
        );
      }
      if (e.id === "err_ramp_sales_cycle_mismatch") {
        questions.push(
          `You noted the hire ramp and sales cycle conflict. How would you restructure the Q3 headcount plan to still hit the year-end target?`
        );
      }
    }
    const cat = (((_i = session.recommendation) == null ? void 0 : _i.category) || "").toLowerCase();
    if (cat === "go" || cat === "proceed") {
      questions.push(
        `Your recommendation is to proceed. What single data point would make you change that view before the board meeting?`
      );
    } else if (cat === "revise") {
      questions.push(
        `You recommended Revise. What is the minimum set of changes to the Q3 plan that would get you comfortable enough to say Go?`
      );
    }
    if (!questions.length) {
      questions.push("What was your biggest uncertainty in this forecast review, and how did you decide to handle it?");
    }
    return questions.slice(0, 4);
  }
  function requireEvidence(dim) {
    if ((!dim.evidence || !dim.evidence.length) && dim.score !== "insufficient_data") {
      return {
        ...dim,
        score: "insufficient_data",
        rationale: `${dim.rationale} (reclassified: no evidence array)`,
        evidence: []
      };
    }
    return dim;
  }
  function evaluateMeridianSession(session) {
    var _a, _b, _c, _d, _e;
    const params = session.params;
    const e1 = detectError1(session);
    const e2 = detectError2(session);
    const e3 = detectError3(session);
    const planted = [
      { id: PLANTED_ERRORS[0].id, title: PLANTED_ERRORS[0].title, status: e1.status, evidence: e1.evidence },
      { id: PLANTED_ERRORS[1].id, title: PLANTED_ERRORS[1].title, status: e2.status, evidence: e2.evidence },
      { id: PLANTED_ERRORS[2].id, title: PLANTED_ERRORS[2].title, status: e3.status, evidence: e3.evidence }
    ];
    const ambiguity = requireEvidence(scoreAmbiguity2(session));
    const hard = [
      requireEvidence(scoreModelingDiscipline(session)),
      requireEvidence(scoreAssumptionChecking(session)),
      {
        dimension: "Concern detection \u2014 Revenue growth vs. churn",
        score: e1.status,
        rationale: e1.status === "caught" ? "Caught with evidence." : "Missed.",
        evidence: e1.evidence,
        method: "deterministic"
      },
      {
        dimension: "Concern detection \u2014 Opex vs. revenue (margin compression)",
        score: e2.status,
        rationale: e2.status === "caught" ? "Caught with evidence." : "Missed.",
        evidence: e2.evidence,
        method: "deterministic"
      },
      {
        dimension: "Concern detection \u2014 Hire ramp vs. extended sales cycle",
        score: e3.status,
        rationale: e3.status === "caught" ? "Caught with evidence." : "Missed.",
        evidence: e3.evidence,
        method: "deterministic"
      }
    ];
    const soft = [
      ambiguity,
      requireEvidence(scoreBusinessJudgment(session, planted)),
      requireEvidence(scoreRiskDetection(session, planted)),
      requireEvidence(scoreCommunicationClarity(session)),
      requireEvidence(scoreAiVerificationBehavior(session))
    ];
    const caughtN = planted.filter((p) => p.status === "caught").length;
    let executive_recommendation = "Hold";
    if (caughtN >= 2 && ambiguity.score === "good") executive_recommendation = "Advance";
    if (caughtN === 0 && ambiguity.score === "poor") executive_recommendation = "Reject";
    const confidence = (session.event_log || []).length >= 12 ? "High" : (session.event_log || []).length >= 6 ? "Medium" : "Low";
    const numericSoft = soft.filter((s) => typeof s.score === "number");
    const avg = numericSoft.length > 0 ? numericSoft.reduce((a, s) => a + s.score, 0) / numericSoft.length : 50;
    const alexExchange = (session.chatMessages || []).filter(
      (m) => m.sender === "alex" || m.triggerId === "A1_reply" || m.sender === "candidate" && m.triggerId === "A1_reply"
    );
    const trapEv = (session.ai_usage_log || []).find((e) => e.trap_triggered);
    const timeline = (session.event_log || []).slice().sort((a, b) => (a.t || 0) - (b.t || 0)).map((e) => ({ t: e.t || 0, label: e.label || e.type, type: e.type }));
    const overall_summary = `Caught ${caughtN}/3 FP&A concerns. Ambiguity handling: ${ambiguity.label || ambiguity.score}. Soft-skill numeric avg: ${Math.round(avg)}. ${AMBIGUITY_POINT.title} classified from verification-steps/memo evidence. Manager update (VP Sales): ${session.m1_fired ? "received and actioned" : "not yet received"}.`;
    const interviewQuestions = generateInterviewQuestions(planted, session);
    return {
      session_id: session.id,
      seed: params.seed,
      executive_recommendation,
      confidence,
      overall_summary,
      planted_errors: planted,
      ambiguity,
      hard_skills: hard,
      soft_skills: soft,
      daniel_exchange: alexExchange,
      // kept as 'daniel_exchange' for API compat — now represents Alex Kim (CFO)
      ai_usage_summary: {
        events: session.ai_usage_log || [],
        trap_triggered: !!trapEv,
        trap_caught: trapEv ? trapEv.trap_caught : null
      },
      benchmark: {
        status: "insufficient_data",
        comparison_text: "Not enough completed pilot sessions yet to benchmark this candidate against real hiring outcomes."
      },
      final_memo: session.finalMemo || [
        (_a = session.recommendation) == null ? void 0 : _a.category,
        (_b = session.recommendation) == null ? void 0 : _b.reason1,
        (_c = session.recommendation) == null ? void 0 : _c.reason2,
        (_d = session.recommendation) == null ? void 0 : _d.reason3,
        (_e = session.recommendation) == null ? void 0 : _e.diligence
      ].filter(Boolean).join("\n"),
      timeline,
      interview_questions: interviewQuestions
    };
  }
  function formatMeridianReport(ev) {
    const lines = [];
    lines.push(`# Evidence Report \u2014 Project Meridian: FP&A Forecast Review`);
    lines.push(`Recommendation: **${ev.executive_recommendation}** (confidence: ${ev.confidence})`);
    lines.push(ev.overall_summary);
    lines.push("");
    lines.push("## VP Memo");
    lines.push(ev.final_memo || "(empty)");
    lines.push("");
    lines.push("## Planted Concerns");
    for (const p of ev.planted_errors) {
      lines.push(`- ${p.title}: **${p.status.toUpperCase()}**`);
      p.evidence.forEach((e) => lines.push(`  evidence: ${e}`));
    }
    lines.push("");
    lines.push(`## Ambiguity Handling (${AMBIGUITY_POINT.title})`);
    lines.push(`${ev.ambiguity.score} \u2014 ${ev.ambiguity.rationale}`);
    ev.ambiguity.evidence.forEach((e) => lines.push(`  evidence: ${e}`));
    lines.push("");
    lines.push("## Hard Skills");
    for (const s of ev.hard_skills) {
      lines.push(`- ${s.dimension}: ${s.score} \u2014 ${s.rationale}`);
      (s.evidence || []).slice(0, 2).forEach((e) => lines.push(`  evidence: ${e}`));
    }
    lines.push("");
    lines.push("## Soft Skills");
    for (const s of ev.soft_skills) {
      lines.push(`- ${s.dimension}: ${s.score} \u2014 ${s.rationale}`);
      (s.evidence || []).slice(0, 2).forEach((e) => lines.push(`  evidence: ${e}`));
    }
    lines.push("");
    lines.push("## CFO Exchange (Alex Kim)");
    for (const m of ev.daniel_exchange) {
      lines.push(`[${m.name}] ${m.body}`);
    }
    lines.push("");
    lines.push("## AI Usage");
    lines.push(
      `trap_triggered=${ev.ai_usage_summary.trap_triggered} trap_caught=${ev.ai_usage_summary.trap_caught}`
    );
    lines.push("");
    lines.push("## Benchmark");
    lines.push(`${ev.benchmark.status}: ${ev.benchmark.comparison_text}`);
    lines.push("");
    lines.push("## Interview Questions");
    ev.interview_questions.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
    return lines.join("\n");
  }

  // js/sim/meridian/session.ts
  function eid() {
    return `ev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }
  function createMeridianSession(opts) {
    const seed = opts.seed || opts.inviteToken || `meridian_${Date.now().toString(36)}`;
    const params = instantiateMeridianSeed(seed);
    const documents = buildMeridianDocuments(params);
    const val = calculateValuation({
      ltm_ebitda: params.q2_revenue,
      exit_multiple: params.gross_margin,
      growth_rate: params.q3_revenue_growth,
      discount_rate: params.opex_growth
    });
    const session = {
      id: `ms_${Date.now().toString(36)}`,
      seed: params.seed,
      params,
      documents,
      synergy_note: synergyDoubleCountNote(params),
      started_at: Date.now(),
      time_limit_sec: 25 * 60,
      event_log: [],
      openedDocs: [],
      assumptions: [],
      risks: [],
      recommendation: {},
      chatMessages: [],
      used_trigger_ids: [],
      d1_fired: false,
      d1_reply_text: null,
      d1_branch: null,
      tabSeconds: {},
      assumptionTexts: [],
      aiAskCountWindow: { t: 0, count: 0 },
      _elapsedSec: 0,
      valuation: {
        growth_rate: params.q3_revenue_growth,
        exit_multiple: params.gross_margin,
        discount_rate: params.opex_growth,
        ...val
      },
      ai_usage_log: [],
      live_insights: buildLiveInsights(params),
      last_saved_at: null,
      plantedErrorFlags: {}
    };
    log(session, "simulation_started", "Started Project Meridian \u2014 FP&A Forecast Review", { seed: params.seed });
    return session;
  }
  function buildLiveInsights(p) {
    const churnGap = Math.round((p.churn_rate - p.industry_churn_avg) * 10) / 10;
    const opexGap = Math.round((p.opex_growth - p.q3_revenue_growth) * 10) / 10;
    const rampCycleDays = p.new_hire_ramp_days + p.sales_cycle_days;
    return [
      {
        id: "ins_churn",
        title: "Churn rate vs. industry avg",
        body: `Plan churn ${p.churn_rate}% vs. peer avg ${p.industry_churn_avg}% (${churnGap > 0 ? "+" : ""}${churnGap} pp above peers). At ${p.churn_rate}% gross churn, the ${p.q3_revenue_growth}% growth target requires strong net expansion.`
      },
      {
        id: "ins_opex",
        title: "Opex growth vs. revenue growth",
        body: `Opex growing ${p.opex_growth}% vs. revenue ${p.q3_revenue_growth}% \u2014 a ${opexGap > 0 ? "+" : ""}${opexGap} pp divergence. EBITDA margin will compress unless revenue outperforms plan.`
      },
      {
        id: "ins_ramp",
        title: "Hire ramp + sales cycle math",
        body: `${p.new_hire_ramp_days}-day ramp + ${p.sales_cycle_days}-day cycle = ${rampCycleDays} days to first deal. If cycle extends 30 days (${p.updated_sales_cycle_days} days total), Q3 hires don't contribute Q3 revenue.`
      }
    ];
  }
  function log(session, type, label, payload) {
    const ev = {
      id: eid(),
      type,
      t: getElapsedSec(session),
      label,
      payload,
      at: (/* @__PURE__ */ new Date()).toISOString()
    };
    session.event_log.push(ev);
    session.last_saved_at = Date.now();
    return ev;
  }
  function getElapsedSec(session) {
    return Math.max(0, Math.floor((Date.now() - session.started_at) / 1e3));
  }
  function getRemainingSec(session) {
    return Math.max(0, session.time_limit_sec - getElapsedSec(session));
  }
  function syncElapsed(session) {
    session._elapsedSec = getElapsedSec(session);
    return session._elapsedSec;
  }
  function viewBrief(session) {
    session._briefViewed = true;
    log(session, "brief_viewed", "Viewed CFO Brief");
    bumpTab(session, "brief", 5);
  }
  function openDocument(session, docId) {
    const doc = session.documents.find((d) => d.id === docId) || null;
    if (!doc) return null;
    if (!session.openedDocs.includes(docId)) session.openedDocs.push(docId);
    log(session, "resource_opened", `Opened ${doc.title}`, { resourceId: docId });
    if (docId === "concentration_note") session.m1_acknowledged = true;
    bumpTab(session, "data_room", 15);
    tick(session);
    return doc;
  }
  function viewFinancials(session) {
    session._financialsViewed = true;
    log(session, "financials_viewed", "Viewed Forecast Model tab");
    bumpTab(session, "financials", 10);
  }
  function adjustValuation(session, patch) {
    session._financialsViewed = true;
    session._valuationAdjusted = true;
    const next = { ...session.valuation, ...patch };
    const calc = calculateValuation({
      ltm_ebitda: session.params.q2_revenue,
      exit_multiple: next.exit_multiple,
      growth_rate: next.growth_rate,
      discount_rate: next.discount_rate
    });
    session.valuation = { ...next, ...calc };
    log(session, "model_edited", "Adjusted forecast model inputs", { ...session.valuation });
    bumpTab(session, "financials", 20);
    if (session.params && next.exit_multiple <= session.params.gross_margin - 2) {
      session.plantedErrorFlags = session.plantedErrorFlags || {};
      session.plantedErrorFlags.err_opex_margin_compression = true;
    }
    return session.valuation;
  }
  function addAssumption(session, text, affects) {
    const row = {
      id: eid(),
      text: String(text || "").trim(),
      affects: affects || "model",
      at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (!row.text) return;
    session.assumptions.push(row);
    session.assumptionTexts = session.assumptions.map((a) => a.text);
    log(session, "assumption_added", `Assumption: ${row.text.slice(0, 80)}`, row);
    session.plantedErrorFlags = session.plantedErrorFlags || {};
    if (/churn|net.*retention|gross.*retention|attrition|growth.*gap|growth.*require/i.test(row.text)) {
      session.plantedErrorFlags.err_growth_churn_mismatch = true;
    }
    if (/opex|margin.*compres|operating.*expense.*revenue|expense.*grow.*faster|18.*12|faster.*revenue/i.test(row.text)) {
      session.plantedErrorFlags.err_opex_margin_compression = true;
    }
    if (/ramp|sales.*cycle.*extend|cycle.*extend|75.*day|q4.*revenue.*hire|hire.*q4|hire.*contribut/i.test(row.text)) {
      session.plantedErrorFlags.err_ramp_sales_cycle_mismatch = true;
      session.m1_acknowledged = true;
    }
    tick(session);
  }
  function addRisk(session, category, text) {
    const row = {
      id: eid(),
      category,
      text: String(text || "").trim(),
      at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (!row.text) return;
    session.risks.push(row);
    log(session, "risk_added", `Risk: ${category}`, row);
    const blob = `${category} ${row.text}`.toLowerCase();
    session.plantedErrorFlags = session.plantedErrorFlags || {};
    if (/churn|net.*retention|gross.*retention|attrition|growth.*gap|growth.*require/.test(blob)) {
      session.plantedErrorFlags.err_growth_churn_mismatch = true;
    }
    if (/opex|margin.*compres|operating.*expense|expense.*faster|revenue.*faster|compress/.test(blob)) {
      session.plantedErrorFlags.err_opex_margin_compression = true;
    }
    if (/ramp|sales.*cycle.*extend|cycle.*extend|75.*day|q4.*hire|hire.*q4|hire.*contribut|no.*q3.*revenue/.test(blob)) {
      session.plantedErrorFlags.err_ramp_sales_cycle_mismatch = true;
      session.m1_acknowledged = true;
    }
    bumpTab(session, "risks", 15);
    tick(session);
  }
  function setRecommendation(session, rec) {
    session.recommendation = { ...session.recommendation || {}, ...rec };
    if (rec.category) {
      session.selectedRecommendation = rec.category;
      session.recommendation_category = rec.category;
      log(session, "recommendation_selected", `Selected ${rec.category}`);
    }
    const memo = [
      rec.category,
      rec.reason1,
      rec.reason2,
      rec.reason3,
      rec.diligence
    ].filter(Boolean).join("\n\n");
    session.finalMemo = memo;
    bumpTab(session, "recommend", 10);
  }
  function bumpTab(session, tab, sec) {
    session.tabSeconds = session.tabSeconds || {};
    session.tabSeconds[tab] = (session.tabSeconds[tab] || 0) + sec;
  }
  function tick(session) {
    syncElapsed(session);
    const msgs = tickChatTriggers(session);
    for (const m of msgs) {
      log(session, "stakeholder_message", `${m.name}: ${m.body.slice(0, 60)}`, {
        triggerId: m.triggerId,
        sender: m.sender
      });
      if (m.triggerId === "J1") {
        session.m1_fired = true;
        log(session, "manager_update", "VP Sales update: sales cycle +30 days, 2 at-risk renewals");
      }
    }
    const rem = getRemainingSec(session);
    if (rem <= 5 * 60 && !session.toast_5min_shown) {
      session.toast_5min_shown = true;
      log(session, "timer_warning", "5 minutes left \u2014 make sure your recommendation is ready to submit.");
    }
    session.last_saved_at = Date.now();
    return msgs;
  }
  function replyToChat(session, text) {
    syncElapsed(session);
    const result = handleCandidateChatReply(session, text);
    if (result.accepted) {
      log(session, "chat_message_sent", "Candidate chat reply", { text });
      if (result.followUp) {
        log(session, "stakeholder_message", `Alex Kim follow-up`, { triggerId: result.followUp.triggerId });
      }
    }
    return result;
  }
  function askAI(session, prompt) {
    syncElapsed(session);
    const result = askMeridianAI(session, session.params, prompt);
    log(session, "ai_assistant_asked", "Asked AI assistant", {
      prompt,
      trap: result.trap_triggered
    });
    tick(session);
    return result;
  }
  function getMissing(session) {
    return getMeridianMissingRequirements(session);
  }
  function canSubmit2(session) {
    return canSubmitMeridian(session) && hasRepliedToD1AndSubstantive(session);
  }
  function submitMeridian(session) {
    if (!canSubmit2(session)) {
      throw new Error(
        "Submit blocked: " + getMissing(session).filter((m) => m.blocking).map((m) => m.label).join("; ")
      );
    }
    session.submitted = true;
    log(session, "final_submitted", "Submitted VP Memo \u2014 FP&A Forecast Review");
    finalizeAiUsage(session, session.params);
    tick(session);
    const evaluation = evaluateMeridianSession({
      id: session.id,
      seed: session.seed,
      params: session.params,
      openedDocs: session.openedDocs,
      assumptions: session.assumptions,
      risks: session.risks,
      recommendation: session.recommendation,
      finalMemo: session.finalMemo,
      valuation: session.valuation,
      event_log: session.event_log,
      chatMessages: session.chatMessages,
      ai_usage_log: session.ai_usage_log,
      d1_reply_text: session.d1_reply_text,
      d1_branch: session.d1_branch,
      tabSeconds: session.tabSeconds,
      _elapsedSec: session._elapsedSec,
      plantedErrorFlags: session.plantedErrorFlags,
      used_trigger_ids: session.used_trigger_ids,
      m1_fired: session.m1_fired
    });
    session.last_saved_at = Date.now();
    return evaluation;
  }

  // js/sim/index.js
  var meridianTemplate = import_meridian_scenario.default || null;
  async function getMeridianTemplate() {
    if (meridianTemplate) return meridianTemplate;
    const loaded = await loadMeridianTemplate();
    if (loaded) meridianTemplate = loaded;
    return meridianTemplate;
  }
  async function instantiateMeridian(seed, templateOverride) {
    const template = resolveMeridianTemplate(templateOverride) || await getMeridianTemplate();
    if (!template) {
      throw new Error(
        "Meridian scenario JSON is not available yet. Pass a template to instantiateScenario(template, seed)."
      );
    }
    return instantiateScenario(template, seed);
  }
  var FydellSim = {
    SIM_CATALOG,
    getSimulation,
    listSimulations,
    makeEventId,
    logEvent,
    listEvents,
    STORAGE_PREFIX,
    createSession,
    saveSession,
    loadSession,
    resumeSession,
    listSessionIds,
    markSubmitted,
    calculateSimulationProgress,
    getMissingSubmissionRequirements,
    canSubmit,
    detectCommitments,
    evaluateCommitments,
    evaluateSession,
    formatEvaluationForReport,
    pickStakeholderMessage,
    generateStakeholderReply,
    ensureNoRepeat,
    mulberry32,
    seedToUint32,
    instantiateAssumptions,
    calculateModel,
    scenarioPack,
    loadMeridianTemplate,
    resolveMeridianTemplate,
    instantiateScenario,
    getMeridianTemplate,
    instantiateMeridian,
    setMeridianTemplate(template) {
      meridianTemplate = resolveMeridianTemplate(template);
      return meridianTemplate;
    },
    // Full Meridian engine (Part B–G)
    Meridian: meridian_exports,
    createMeridianSession,
    submitMeridian,
    evaluateMeridianSession,
    formatMeridianReport,
    hasRepliedToD1AndSubstantive,
    tickMeridianChat: tick,
    meridianAskAI: askAI,
    meridianReplyChat: replyToChat,
    meridianCanSubmit: canSubmit2,
    meridianGetMissing: getMissing,
    meridianAdjustValuation: adjustValuation,
    meridianAddAssumption: addAssumption,
    meridianAddRisk: addRisk,
    meridianOpenDocument: openDocument,
    meridianViewBrief: viewBrief,
    meridianSetRecommendation: setRecommendation,
    meridianGetRemaining: getRemainingSec,
    meridianGetElapsed: getElapsedSec,
    meridianProgress: calculateMeridianProgress,
    meridianStages: getStageCompletion
  };
  try {
    if (typeof globalThis !== "undefined") {
      globalThis.FydellSim = FydellSim;
    }
  } catch (e) {
  }

  // js/sim/browser-entry.js
  try {
    if (typeof globalThis !== "undefined") globalThis.FydellSim = FydellSim;
  } catch (_) {
  }
  try {
    if (typeof window !== "undefined") window.FydellSim = FydellSim;
  } catch (_) {
  }
  var browser_entry_default = FydellSim;
})();
