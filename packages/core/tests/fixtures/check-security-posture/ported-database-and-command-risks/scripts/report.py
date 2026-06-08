import os


def render_report(request):
    os.system(f"wkhtmltopdf {request.args['url']} /tmp/report.pdf")
