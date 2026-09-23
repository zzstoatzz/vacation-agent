import unittest
from urllib.parse import parse_qs, urlparse

from vacation_agent.graph import travel_links


class TravelLinksTests(unittest.TestCase):
    def test_encodes_destination_and_departure(self):
        links = travel_links.invoke(
            {"destination": "  São Paulo & coast  ", "departure_city": " Chicago "}
        )
        self.assertEqual(
            parse_qs(urlparse(links["flights"]).query),
            {"q": ["flights from Chicago to São Paulo & coast"]},
        )
        self.assertEqual(
            parse_qs(urlparse(links["activities"]).query),
            {"api": ["1"], "query": ["things to do in São Paulo & coast"]},
        )
        self.assertEqual(
            parse_qs(urlparse(links["hotels"]).query),
            {"q": ["hotels in São Paulo & coast"]},
        )

    def test_departure_is_optional(self):
        links = travel_links.invoke({"destination": "Lisbon"})
        self.assertEqual(
            parse_qs(urlparse(links["flights"]).query), {"q": ["flights to Lisbon"]}
        )

    def test_blank_destination_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "destination is required"):
            travel_links.invoke({"destination": "   "})


if __name__ == "__main__":
    unittest.main()
