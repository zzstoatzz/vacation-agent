import os
from urllib.parse import urlencode

from langchain.agents import create_agent
from langchain.tools import tool
from langchain_openai import ChatOpenAI


@tool
def travel_links(destination: str, departure_city: str = "") -> dict[str, str]:
    """Build search links for flights, lodging, and activities; does not fetch live results or prices."""
    destination = destination.strip()
    if not destination:
        raise ValueError("A destination is required")
    flights = (
        f"flights from {departure_city.strip()} to {destination}"
        if departure_city.strip()
        else f"flights to {destination}"
    )
    return {
        "flights": "https://www.google.com/travel/flights?" + urlencode({"q": flights}),
        "hotels": "https://www.google.com/travel/hotels?"
        + urlencode({"q": f"hotels in {destination}"}),
        "activities": "https://www.google.com/maps/search/?"
        + urlencode({"api": 1, "query": f"things to do in {destination}"}),
    }


graph = create_agent(
    model=ChatOpenAI(
        model=os.environ.get("VACATION_MODEL", "openai/gpt-6-sol"),
        base_url="https://gateway.smith.langchain.com/v1",
        api_key=lambda: os.environ["LANGSMITH_API_KEY"],
    ),
    tools=[travel_links],
    system_prompt="""You help people plan vacations, with practical itineraries and useful links.
Ask briefly for missing essentials: departure city, dates or duration, travelers,
total budget and currency, and interests. If the user asks for ideas, work with
explicit assumptions instead of requiring every field.
Offer up to three destinations with tradeoffs, then let the traveler choose.
For a selected destination, give a relaxed day-by-day itinerary, rough budget
categories, and use travel_links to provide flight, lodging, and activity links.
This starter has no live web search. Clearly label costs as rough estimates;
never claim to have checked availability, prices, weather, or opening hours.
Search links are starting points, not researched sources or booking confirmations.
Never book or purchase anything. Incorporate follow-up changes into the plan.
""",
    name="vacation_planner",
)
