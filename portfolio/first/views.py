from django.shortcuts import render

#from django.http import HttpResponse


def home(request):

    #return HttpResponse("done")

    return render(request,'base/home.html')

def terms(request):
    return render(request, "base/terms.html")