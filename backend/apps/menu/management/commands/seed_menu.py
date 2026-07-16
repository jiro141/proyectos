"""
Management command para poblar la base de datos con el menú de El Patio.
Lee el archivo backend/menu.txt y crea categorías + items con versiones y precios.

Uso:
    python manage.py seed_menu
    python manage.py seed_menu --file=ruta/al/menu.txt
"""

import re
import os
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from apps.menu.models import Category, MenuItem


def parse_price(text):
    """Convierte '18.000' o '18000' a 18000"""
    return int(text.replace('.', '').replace(',', ''))


def parse_menu(filepath):
    """
    Parsea menu.txt y devuelve:
    [
        {
            'category': 'Pizzas',
            'items': [
                {
                    'name': 'La Patio',
                    'description': 'salsa, queso, champiñones, ...',
                    'versions': [
                        {'name': 'Pequeña', 'price': 18000},
                    ]
                },
            ]
        },
    ]
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    menu = []

    # 1. Extraer cada bloque de categoría: desde CATEGORÍA: hasta la próxima CATEGORÍA: o NOTA: o fin
    category_blocks = re.split(
        r'(?=CATEGORÍA:\s*.+)',
        content,
        flags=re.IGNORECASE,
    )

    for block in category_blocks:
        block = block.strip()
        if not block or not re.search(r'CATEGORÍA:', block, re.IGNORECASE):
            continue

        # Extraer nombre de categoría
        cat_match = re.search(r'CATEGORÍA:\s*(.+)', block, re.IGNORECASE)
        if not cat_match:
            continue
        category_name = cat_match.group(1).strip().title()

        # Sacar la línea de CATEGORÍA y el separador ====
        body = re.sub(r'^CATEGORÍA:.*', '', block, flags=re.IGNORECASE)
        body = re.sub(r'^[=\s]+', '', body)  # sacar ==== y espacios

        # Parsear productos
        items = parse_products(category_name, body)
        if items:
            menu.append({'category': category_name, 'items': items})

    return menu


def parse_products(category_name, body):
    """Parsea los PRODUCTO: dentro del cuerpo de una categoría."""
    items = []

    # Separar por PRODUCTO:
    product_blocks = re.split(r'PRODUCTO:\s*', body)

    for pb in product_blocks:
        pb = pb.strip()
        if not pb:
            continue

        lines = pb.split('\n')
        product_name = lines[0].strip().rstrip(':')
        rest = '\n'.join(lines[1:])

        # Descripción / ingredientes
        description = ''
        ing_match = re.search(r'Ingredientes\s*:\s*(.+?)(?:\n\s*\n|$)', rest, re.IGNORECASE | re.DOTALL)
        if not ing_match:
            ing_match = re.search(r'Ingredientes\s*:\s*(.+)', rest, re.IGNORECASE)
        if ing_match:
            description = ing_match.group(1).strip().rstrip('.')
            # Limpiar: sacar "no especificados en el menú"
            if description.lower().startswith('no especificado'):
                description = ''

        # Adicionales
        adic_match = re.search(r'Adicional\s*:\s*(.+?)(?:\n|$)', rest, re.IGNORECASE)
        if adic_match:
            adic_text = adic_match.group(1).strip()
            if description:
                description += '. ' + adic_text

        # Versiones
        versions = parse_versions(rest)

        # Si no hay versiones explícitas, buscar precio suelto
        if not versions:
            price_match = re.search(r'Precio\s*:\s*([\d.]+)', rest)
            if price_match:
                price = parse_price(price_match.group(1))
                versions = [{'name': 'Porción', 'price': price}]
            else:
                versions = [{'name': 'Porción', 'price': 0}]

        items.append({
            'name': product_name,
            'description': description,
            'versions': versions,
        })

    # Si no hay PRODUCTO:, intentar parseo implícito (Brochetas, Alitas, etc.)
    if not items:
        items = parse_implicit_products(category_name, body)
    else:
        # Para categorías como Brochetas que TIENEN PRODUCTO: pero también tienen
        # versiones con nombres que son sabores (no tamaños)
        # Chequear si el nombre de la versión NO es un tamaño típico
        pass

    return items


def parse_implicit_products(category_name, body):
    """
    Para categorías sin PRODUCTO: explícito.
    Casos: Brochetas, Alitas, Salchipapas, etc.
    """
    items = []

    # Buscar Versiones: y parsear líneas con "| Precio:"
    vs_match = re.search(r'Versiones\s*:\s*(.+?)(?:$|\n\s*\n\s*(?:Adicional|NOTA|Adicional\sopcional|\Z))', body, re.IGNORECASE | re.DOTALL)
    if not vs_match:
        # Fallback: buscar líneas sueltas con | Precio:
        vs_text = body
    else:
        vs_text = vs_match.group(1).strip()

    # Parsear: - nombre | Precio: valor
    version_lines = re.findall(r'-\s*(.+?)\s*\|\s*Precio\s*:\s*([\d.]+)', vs_text)

    # Descripción general si hay
    description = ''
    ing_match = re.search(r'Ingredientes\s*:\s*(.+?)(?:\n|$)', body, re.IGNORECASE)
    if ing_match:
        description = ing_match.group(1).strip().rstrip('.')

    # Para Alitas Búfalo: buscamos PRODUCTO: o nombre base
    product_match = re.search(r'PRODUCTO:\s*(.+)', body, re.IGNORECASE)
    base_name = product_match.group(1).strip() if product_match else category_name

    for vname, vprice in version_lines:
        vname = vname.strip()
        # Caso especial: Alitas Búfalo donde las versiones son "Tradicionales" y "Horneadas"
        # y el producto base es "Alitas Búfalo"
        full_name = f"{base_name} - {vname}"
        items.append({
            'name': full_name,
            'description': description,
            'versions': [{'name': 'Porción', 'price': parse_price(vprice)}],
        })

    return items


def parse_versions(text):
    """
    Parsea las versiones de un producto.
    Formato:
    - Pequeña | Precio: 18.000
    - Mediana | Precio: 31.000
    """
    versions = []

    # Buscar "Versiones:" en el texto
    idx = text.lower().find('versiones:')
    if idx == -1:
        return versions

    # Tomar todo desde "Versiones:" hasta el final del bloque
    after_versions = text[idx + 10:]

    # Recorrer línea por línea, solo las que empiezan con "-"
    for line in after_versions.split('\n'):
        line = line.strip()
        m = re.match(r'-\s*(.+?)\s*\|\s*Precio\s*:\s*([\d.]+)', line)
        if m:
            vname = m.group(1).strip()
            vprice = parse_price(m.group(2))
            versions.append({'name': vname, 'price': vprice})
        elif line and not line.startswith('-') and not line.startswith('Ingredientes') and not line.startswith('Adicional'):
            # Si encontramos una línea que no es versión ni ingrediente ni adicional, terminamos
            # (esto evita capturar PRODUCTO: siguiente como versión)
            if not line.startswith('NOTA'):
                break

    return versions


class Command(BaseCommand):
    help = 'Pobla la base de datos con el menú desde menu.txt'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default='',
            help='Ruta al archivo menu.txt',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Solo mostrar qué se va a crear sin modificar la DB',
        )

    def handle(self, *args, **options):
        filepath = options['file']
        if not filepath:
            filepath = os.path.join(settings.BASE_DIR, 'menu.txt')

        if not os.path.exists(filepath):
            raise CommandError(f'Archivo no encontrado: {filepath}')

        self.stdout.write(f'📖 Leyendo menú desde: {filepath}')
        menu = parse_menu(filepath)

        if not menu:
            self.stdout.write(self.style.WARNING('⚠️  No se encontraron datos en el archivo'))
            return

        total_items = 0
        dry_run = options['dry_run']

        for cat_data in menu:
            cat_name = cat_data['category']

            if dry_run:
                self.stdout.write(f'\n📁 {cat_name}')
            else:
                category, created = Category.objects.get_or_create(
                    name=cat_name,
                    defaults={'description': f'Categoría {cat_name}'},
                )
                label = 'creada' if created else 'existente'
                self.stdout.write(f'\n📁 {cat_name} ({label})')

            for item_data in cat_data['items']:
                for version in item_data['versions']:
                    full_name = f"{item_data['name']} - {version['name']}"

                    desc = item_data.get('description', '')
                    if desc and desc.lower() != 'no especificados en el menú':
                        desc = f"Ingredientes: {desc}"

                    if dry_run:
                        self.stdout.write(f'  • {full_name} — ${version["price"]:,}')
                    else:
                        _, created = MenuItem.objects.get_or_create(
                            name=full_name,
                            category=category,
                            defaults={
                                'description': desc,
                                'price': version['price'],
                                'available': True,
                            },
                        )
                        if created:
                            total_items += 1
                            self.stdout.write(f'  ✅ {full_name} — ${version["price"]:,}')

        if dry_run:
            self.stdout.write(self.style.SUCCESS(f'\n🎯 Dry run: {sum(len(c["items"]) for c in menu)} productos listos para crear'))
        else:
            self.stdout.write(self.style.SUCCESS(f'\n🎉 Menú cargado: {total_items} items creados'))
