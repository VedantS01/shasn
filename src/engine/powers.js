export const passiveFor = (n) => Math.floor(n / 2);
export const level = (n) => (n >= 6 ? 6 : n >= 4 ? 4 : 0);

export const POWERS = {
  capitalist: {
    l4: { name: "Open Market", text: "Return 1 resource to the Public Reserve and take any 2." },
    l6: { name: "Land Grab",   text: "Evict up to 2 non-volatile voters; opponent voters return to hand." }
  },
  supremo: {
    l4: { name: "Donations",   text: "Snatch up to 2 resources from other players." },
    l6: { name: "Civil Disobedience", text: "Pay 1 resource per voter to discard up to 2 opponent voters." }
  },
  showman: {
    l4: { name: "Echo Chamber",     text: "+1 voter per unique Vote Bank Card you influence (cap 3)." },
    l6: { name: "Targeted Marketing", text: "Spend 2 Media + any 3 to convert 2 of an opponent's voters in one zone." }
  },
  idealist: {
    l4: { name: "Blind Faith",       text: "Waive the marked resource on up to 3 Vote Bank Cards/turn." },
    l6: { name: "Mass Mobilisation", text: "Each majority yields 2 gerrymander moves/turn instead of 1." }
  }
};
