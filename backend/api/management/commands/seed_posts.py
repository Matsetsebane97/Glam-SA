"""Seeds local development data for the community feed."""

from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import Post, UserProfile

SAMPLE_POSTS = [
    {
        "creator": "Lethabo Ink Studio",
        "handle": "@lethabo_tattoos",
        "location": "Braamfontein, Johannesburg",
        "latitude": Decimal("-26.1929"),
        "longitude": Decimal("28.0345"),
        "service": "Tattoos",
        "caption": "Fine-line botanical sleeve tattoo done with single needle technique. 4.5 hour session.",
        "image_url": "https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=900&auto=format&fit=crop&q=80",
    },
    {
        "creator": "Mzansi Black Ink",
        "handle": "@mzansi_blackink",
        "location": "Woodstock, Cape Town",
        "latitude": Decimal("-33.9289"),
        "longitude": Decimal("18.4502"),
        "service": "Tattoos",
        "caption": "Minimalist geometric spine tattoo on melanin skin. Healed with organic balm.",
        "image_url": "https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=900&auto=format&fit=crop&q=80",
    },
    {
        "creator": "Naledi Braids Bar",
        "handle": "@naledi_braids",
        "location": "Sandton, Johannesburg",
        "latitude": Decimal("-26.1076"),
        "longitude": Decimal("28.0567"),
        "service": "Hair",
        "caption": "Bum-length knotless bohemian braids with human hair curls. Lightweight and pain-free.",
        "image_url": "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=900&auto=format&fit=crop&q=80",
    },
    {
        "creator": "Durban Crown Cuts",
        "handle": "@durban_crowncuts",
        "location": "Morningside, Durban",
        "latitude": Decimal("-29.8318"),
        "longitude": Decimal("31.0116"),
        "service": "Barbering",
        "caption": "Skin taper fade with sharp razor outline and natural beard oil treatment.",
        "image_url": "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=900&auto=format&fit=crop&q=80",
    },
    {
        "creator": "Pretoria Luxe Nails",
        "handle": "@pta_luxenails",
        "location": "Menlyn, Pretoria",
        "latitude": Decimal("-25.7828"),
        "longitude": Decimal("28.2753"),
        "service": "Nails",
        "caption": "Almond glazed chrome French gel overlay. Lasts 4+ weeks with zero chipping.",
        "image_url": "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=900&auto=format&fit=crop&q=80",
    },
    {
        "creator": "Lerato Bridal Glam",
        "handle": "@lerato_glam",
        "location": "Rosebank, Johannesburg",
        "latitude": Decimal("-26.1467"),
        "longitude": Decimal("28.0416"),
        "service": "Makeup",
        "caption": "Signature soft bridal glam with radiant skin finish and fluffy mink lashes.",
        "image_url": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=900&auto=format&fit=crop&q=80",
    },
    {
        "creator": "Soweto Glow Skin Clinic",
        "handle": "@soweto_glow",
        "location": "Vilakazi St, Soweto",
        "latitude": Decimal("-26.2366"),
        "longitude": Decimal("27.9077"),
        "service": "Skincare",
        "caption": "Hydra-dermabrasion glass skin treatment for hyperpigmentation correction.",
        "image_url": "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=900&auto=format&fit=crop&q=80",
    },
]

class Command(BaseCommand):
    help = "Seeds sample South African beauty and tattoo portfolio works"

    def handle(self, *args, **options):
        for data in SAMPLE_POSTS:
            email = f"{data['handle'].lstrip('@')}@glamsa.co.za"
            user, created = User.objects.get_or_create(
                username=email,
                defaults={"first_name": data["creator"], "email": email}
            )
            if created:
                user.set_password("GlamSA2026!")
                user.save()

            UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    "latitude": data["latitude"],
                    "longitude": data["longitude"],
                    "location_label": data["location"],
                }
            )

            post, p_created = Post.objects.get_or_create(
                creator=data["creator"],
                handle=data["handle"],
                service=data["service"],
                defaults={
                    "owner": user,
                    "location": data["location"],
                    "latitude": data["latitude"],
                    "longitude": data["longitude"],
                    "caption": data["caption"],
                    "image_url": data["image_url"],
                    "media_type": "image/jpeg",
                }
            )
            status = "Created" if p_created else "Exists"
            self.stdout.write(f"{status}: {data['creator']} - {data['service']}")

        self.stdout.write(self.style.SUCCESS("Successfully seeded sample works!"))
